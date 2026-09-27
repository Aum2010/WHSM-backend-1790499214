import { Test } from '@nestjs/testing'
import { QaService }     from './qa.service'
import { PrismaService } from '../../prisma/prisma.service'
import { WHSMLogger }    from '../../logger/logger.service'
import { NotFoundException, BadRequestException } from '@nestjs/common'

const mockLot = {
  id: 'lot-1', lotNo: '01092026/001',
  status: 'AVAILABLE', materialCode: 'RM-PORK-01',
}

const mockReport = {
  id: 'rep-1', reportNo: 'DEV-20260921-0001',
  lotNo: '01092026/001', status: 'OPEN', reworkCount: 0,
}

describe('QaService', () => {
  let service: QaService

  const mockPrisma = {
    stockLot:        { findUnique: jest.fn(), update: jest.fn() },
    deviationReport: {
      findUnique: jest.fn(), findFirst: jest.fn(),
      findMany:   jest.fn(), create:    jest.fn(),
      update:     jest.fn(), updateMany: jest.fn(),
    },
    systemHold: { findUnique: jest.fn(), update: jest.fn() },
    $transaction: jest.fn(fn => fn(mockPrisma)),
  }
  const mockLogger = { business: jest.fn() }

  beforeEach(async () => {
    jest.clearAllMocks()
    const module = await Test.createTestingModule({
      providers: [
        QaService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: WHSMLogger,    useValue: mockLogger },
      ],
    }).compile()
    service = module.get(QaService)
  })

  describe('createDeviationAndHold', () => {
    it('should create deviation and hold lot', async () => {
      mockPrisma.stockLot.findUnique.mockResolvedValue({ ...mockLot })
      mockPrisma.deviationReport.create.mockResolvedValue({ ...mockReport })
      mockPrisma.stockLot.update.mockResolvedValue({ ...mockLot, status: 'HOLD' })

      await service.createDeviationAndHold({
        lotNo: '01092026/001', description: 'พบปัญหา', reportedBy: 'qa-user',
      })
      expect(mockPrisma.stockLot.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ status: 'HOLD' }) })
      )
    })

    it('should throw if lot already on HOLD', async () => {
      mockPrisma.stockLot.findUnique.mockResolvedValue({ ...mockLot, status: 'HOLD' })
      await expect(service.createDeviationAndHold({
        lotNo: '01092026/001', description: 'พบปัญหา', reportedBy: 'qa-user',
      })).rejects.toThrow(BadRequestException)
    })

    it('should throw if lot not found', async () => {
      mockPrisma.stockLot.findUnique.mockResolvedValue(null)
      await expect(service.createDeviationAndHold({
        lotNo: 'NOT-EXIST', description: 'พบปัญหา', reportedBy: 'qa-user',
      })).rejects.toThrow(NotFoundException)
    })
  })

  describe('releaseLot', () => {
    it('should release lot and close deviation', async () => {
      mockPrisma.stockLot.findUnique.mockResolvedValue({ ...mockLot, status: 'HOLD' })
      mockPrisma.stockLot.update.mockResolvedValue({ ...mockLot, status: 'AVAILABLE' })
      mockPrisma.deviationReport.updateMany.mockResolvedValue({ count: 1 })

      const result = await service.releaseLot('01092026/001', {
        resolvedBy: 'qa-user', resolution: 'ตรวจสอบแล้วปลอดภัย',
      })
      expect(mockPrisma.stockLot.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ status: 'AVAILABLE' }) })
      )
    })

    it('should throw if lot not on HOLD', async () => {
      mockPrisma.stockLot.findUnique.mockResolvedValue({ ...mockLot, status: 'AVAILABLE' })
      await expect(service.releaseLot('01092026/001', {
        resolvedBy: 'qa-user', resolution: 'test',
      })).rejects.toThrow(BadRequestException)
    })
  })

  describe('approveRework', () => {
    it('should set lot to REWORK and increment count', async () => {
      mockPrisma.stockLot.findUnique.mockResolvedValue({ ...mockLot, status: 'HOLD' })
      mockPrisma.deviationReport.findFirst.mockResolvedValue({ ...mockReport })
      mockPrisma.stockLot.update.mockResolvedValue({ ...mockLot, status: 'REWORK' })
      mockPrisma.deviationReport.update.mockResolvedValue({ ...mockReport, reworkCount: 1 })

      const result = await service.approveRework('01092026/001', {
        resolvedBy: 'qa-user', resolution: 'ส่ง rework',
      })
      expect(result.message).toContain('Rework')
      expect(mockPrisma.stockLot.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { status: 'REWORK' } })
      )
    })
  })

  describe('toggleSystemHold', () => {
    it('should activate system hold', async () => {
      mockPrisma.systemHold.update.mockResolvedValue({ isActive: true })
      await service.toggleSystemHold({ hold: true, reason: 'พบปัญหาใหญ่', activatedBy: 'qa-user' })
      expect(mockPrisma.systemHold.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ isActive: true }) })
      )
    })

    it('should deactivate system hold', async () => {
      mockPrisma.systemHold.update.mockResolvedValue({ isActive: false })
      await service.toggleSystemHold({ hold: false })
      expect(mockPrisma.systemHold.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ isActive: false }) })
      )
    })
  })
})