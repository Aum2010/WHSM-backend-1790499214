import { Test } from '@nestjs/testing'
import { InventoryService } from './inventory.service'
import { PrismaService }   from '../../prisma/prisma.service'
import { WHSMLogger }      from '../../logger/logger.service'
import { NotFoundException, BadRequestException } from '@nestjs/common'

const mockLot = {
  id: 'lot-1', lotNo: '01092026/001', materialCode: 'RM-PORK-01',
  materialName: 'เนื้อหมู', quantity: 500, remainingQty: 500,
  unit: 'kg', location: 'WHC', status: 'AVAILABLE',
}

describe('InventoryService', () => {
  let service: InventoryService

  const mockPrisma = {
    stockLot: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    stockTransaction: { create: jest.fn() },
    systemHold: { findUnique: jest.fn() },
    $transaction: jest.fn(fn => fn(mockPrisma)),
  }
  const mockLogger = { business: jest.fn(), userAction: jest.fn(), error: jest.fn() }

  beforeEach(async () => {
    jest.clearAllMocks()
    const module = await Test.createTestingModule({
      providers: [
        InventoryService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: WHSMLogger,    useValue: mockLogger },
      ],
    }).compile()
    service = module.get(InventoryService)
  })

  describe('getLot', () => {
    it('should return lot when found', async () => {
      mockPrisma.stockLot.findUnique.mockResolvedValue(mockLot)
      const result = await service.getLot('01092026/001')
      expect(result.lotNo).toBe('01092026/001')
    })

    it('should throw NotFoundException when lot not found', async () => {
      mockPrisma.stockLot.findUnique.mockResolvedValue(null)
      await expect(service.getLot('NOTEXIST')).rejects.toThrow(NotFoundException)
    })
  })

  describe('createRM (FIFO)', () => {
    it('should deduct stock from oldest lot', async () => {
      mockPrisma.stockLot.findFirst.mockResolvedValue(mockLot)
      mockPrisma.stockLot.update.mockResolvedValue({ ...mockLot, remainingQty: 400 })
      mockPrisma.stockTransaction.create.mockResolvedValue({ id: 'tx-1' })

      await service.createRM({ materialCode: 'RM-PORK-01', quantity: 100, unit: 'kg', location: 'WHC', performedBy: 'user-1' })
      expect(mockPrisma.stockLot.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ remainingQty: { decrement: '100' } }) })
      )
    })

    it('should throw when stock insufficient', async () => {
      mockPrisma.stockLot.findFirst.mockResolvedValue({ ...mockLot, remainingQty: 50 })
      await expect(service.createRM({ materialCode: 'RM-PORK-01', quantity: 100, unit: 'kg', location: 'WHC', performedBy: 'user-1' }))
        .rejects.toThrow(BadRequestException)
    })

    it('should throw when no lot found', async () => {
      mockPrisma.stockLot.findFirst.mockResolvedValue(null)
      await expect(service.createRM({ materialCode: 'RM-PORK-01', quantity: 100, unit: 'kg', location: 'WHC', performedBy: 'user-1' }))
        .rejects.toThrow(NotFoundException)
    })
  })

  describe('dispatchSO', () => {
    it('should block dispatch when system hold active', async () => {
      mockPrisma.stockLot.findUnique.mockResolvedValue(mockLot)
      mockPrisma.systemHold.findUnique.mockResolvedValue({ isActive: true })
      await expect(service.dispatchSO({ lotNo: '01092026/001', quantity: 100, unit: 'kg', performedBy: 'user-1', soNo: 'SO-001' }))
        .rejects.toThrow(BadRequestException)
    })

    it('should block dispatch when lot on HOLD', async () => {
      mockPrisma.stockLot.findUnique.mockResolvedValue({ ...mockLot, status: 'HOLD' })
      mockPrisma.systemHold.findUnique.mockResolvedValue({ isActive: false })
      await expect(service.dispatchSO({ lotNo: '01092026/001', quantity: 100, unit: 'kg', performedBy: 'user-1', soNo: 'SO-001' }))
        .rejects.toThrow(BadRequestException)
    })
  })
})
