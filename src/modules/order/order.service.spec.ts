import { Test } from '@nestjs/testing'
import { OrderService }  from './order.service'
import { PrismaService } from '../../prisma/prisma.service'
import { WHSMLogger }    from '../../logger/logger.service'
import { NotFoundException, BadRequestException } from '@nestjs/common'

const mockSO = {
  id: 'so-1', soNo: 'SO-2026-0001',
  orderType: 'GENERAL', status: 'PENDING',
  createdBy: 'user-1', items: [],
}

describe('OrderService', () => {
  let service: OrderService

  const mockPrisma = {
    soDocument: {
      findUnique: jest.fn(),
      findMany:   jest.fn(),
      create:     jest.fn(),
      update:     jest.fn(),
    },
    systemHold: { findUnique: jest.fn() },
  }
  const mockLogger = { business: jest.fn() }

  beforeEach(async () => {
    jest.clearAllMocks()
    const module = await Test.createTestingModule({
      providers: [
        OrderService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: WHSMLogger,    useValue: mockLogger },
      ],
    }).compile()
    service = module.get(OrderService)
  })

  describe('createSO', () => {
    it('should create SO with PENDING status', async () => {
      mockPrisma.soDocument.create.mockResolvedValue({ ...mockSO })
      const result = await service.createSO({
        orderType: 'GENERAL', createdBy: 'user-1',
        items: [{ materialCode: 'RM-PORK-01', materialName: 'เนื้อหมู', quantity: 100, unit: 'kg' }],
      })
      expect(mockPrisma.soDocument.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: 'PENDING' }),
        })
      )
    })
  })

  describe('confirmSO', () => {
    it('should confirm SO when PENDING', async () => {
      mockPrisma.soDocument.findUnique.mockResolvedValue({ ...mockSO, status: 'PENDING' })
      mockPrisma.systemHold.findUnique.mockResolvedValue({ isActive: false })
      mockPrisma.soDocument.update.mockResolvedValue({ ...mockSO, status: 'CONFIRMED' })

      const result = await service.confirmSO('SO-2026-0001', { confirmedBy: 'wh-user' })
      expect(mockPrisma.soDocument.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: 'CONFIRMED' }),
        })
      )
    })

    it('should throw when system hold active', async () => {
      mockPrisma.soDocument.findUnique.mockResolvedValue({ ...mockSO, status: 'PENDING' })
      mockPrisma.systemHold.findUnique.mockResolvedValue({ isActive: true })
      await expect(service.confirmSO('SO-2026-0001', { confirmedBy: 'wh-user' }))
        .rejects.toThrow(BadRequestException)
    })

    it('should throw when SO not PENDING', async () => {
      mockPrisma.soDocument.findUnique.mockResolvedValue({ ...mockSO, status: 'CONFIRMED' })
      mockPrisma.systemHold.findUnique.mockResolvedValue({ isActive: false })
      await expect(service.confirmSO('SO-2026-0001', { confirmedBy: 'wh-user' }))
        .rejects.toThrow(BadRequestException)
    })
  })

  describe('confirmPayment', () => {
    it('should update status to PAID', async () => {
      mockPrisma.soDocument.findUnique.mockResolvedValue({ ...mockSO, status: 'CONFIRMED' })
      mockPrisma.soDocument.update.mockResolvedValue({ ...mockSO, status: 'PAID' })

      await service.confirmPayment('SO-2026-0001')
      expect(mockPrisma.soDocument.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: 'PAID' }),
        })
      )
    })
  })

  describe('shipSO', () => {
    it('should throw when SO not PAID', async () => {
      mockPrisma.soDocument.findUnique.mockResolvedValue({ ...mockSO, status: 'CONFIRMED' })
      await expect(service.shipSO('SO-2026-0001'))
        .rejects.toThrow(BadRequestException)
    })
  })
})