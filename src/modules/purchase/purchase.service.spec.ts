import { Test } from '@nestjs/testing'
import { PurchaseService } from './purchase.service'
import { PrismaService }   from '../../prisma/prisma.service'
import { WHSMLogger }      from '../../logger/logger.service'
import { NotFoundException, BadRequestException } from '@nestjs/common'

const mockPO = {
  id: 'po-1', poNo: 'PO-2026-0001',
  supplierCode: 'SUP-001', supplierName: 'บริษัท ABC จำกัด',
  status: 'PENDING', createdBy: 'user-1', items: [],
}

describe('PurchaseService', () => {
  let service: PurchaseService

  const mockPrisma = {
    poDocument: {
      findUnique: jest.fn(),
      findMany:   jest.fn(),
      create:     jest.fn(),
      update:     jest.fn(),
    },
  }
  const mockLogger = { business: jest.fn() }

  beforeEach(async () => {
    jest.clearAllMocks()
    const module = await Test.createTestingModule({
      providers: [
        PurchaseService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: WHSMLogger,    useValue: mockLogger },
      ],
    }).compile()
    service = module.get(PurchaseService)
  })

  describe('createPO', () => {
    it('should create PO with PENDING status', async () => {
      mockPrisma.poDocument.create.mockResolvedValue({ ...mockPO })
      await service.createPO({
        supplierCode: 'SUP-001', supplierName: 'บริษัท ABC',
        createdBy: 'user-1',
        items: [{ materialCode: 'RM-PORK-01', materialName: 'เนื้อหมู', quantity: 500, unit: 'kg' }],
      })
      expect(mockPrisma.poDocument.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: 'PENDING' }),
        })
      )
    })
  })

  describe('approvePO', () => {
    it('should approve PENDING PO', async () => {
      mockPrisma.poDocument.findUnique.mockResolvedValue({ ...mockPO })
      mockPrisma.poDocument.update.mockResolvedValue({ ...mockPO, status: 'APPROVED' })
      await service.approvePO('PO-2026-0001')
      expect(mockPrisma.poDocument.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { status: 'APPROVED' } })
      )
    })

    it('should throw if PO not PENDING', async () => {
      mockPrisma.poDocument.findUnique.mockResolvedValue({ ...mockPO, status: 'APPROVED' })
      await expect(service.approvePO('PO-2026-0001'))
        .rejects.toThrow(BadRequestException)
    })
  })

  describe('markReceived', () => {
    it('should throw if PO not SHIPPED', async () => {
      mockPrisma.poDocument.findUnique.mockResolvedValue({ ...mockPO, status: 'APPROVED' })
      await expect(service.markReceived('PO-2026-0001'))
        .rejects.toThrow(BadRequestException)
    })

    it('should mark as RECEIVED and set receivedAt', async () => {
      mockPrisma.poDocument.findUnique.mockResolvedValue({ ...mockPO, status: 'SHIPPED' })
      mockPrisma.poDocument.update.mockResolvedValue({ ...mockPO, status: 'RECEIVED' })
      await service.markReceived('PO-2026-0001')
      expect(mockPrisma.poDocument.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: 'RECEIVED' }),
        })
      )
    })
  })

  describe('cancelPO', () => {
    it('should cancel PENDING PO', async () => {
      mockPrisma.poDocument.findUnique.mockResolvedValue({ ...mockPO })
      mockPrisma.poDocument.update.mockResolvedValue({ ...mockPO, status: 'CANCELLED' })
      await service.cancelPO('PO-2026-0001')
      expect(mockPrisma.poDocument.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { status: 'CANCELLED' } })
      )
    })

    it('should throw if PO already RECEIVED', async () => {
      mockPrisma.poDocument.findUnique.mockResolvedValue({ ...mockPO, status: 'RECEIVED' })
      await expect(service.cancelPO('PO-2026-0001'))
        .rejects.toThrow(BadRequestException)
    })
  })
})