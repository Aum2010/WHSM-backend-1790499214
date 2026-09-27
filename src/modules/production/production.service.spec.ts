import { Test } from '@nestjs/testing'
import { ProductionService } from './production.service'
import { PrismaService }     from '../../prisma/prisma.service'
import { WHSMLogger }        from '../../logger/logger.service'
import { NotFoundException, BadRequestException } from '@nestjs/common'

const mockBatch = {
  id: 'batch-1', batchNo: 'BATCH-20260921-0001',
  productCode: 'PROD-001', productName: 'หมูปิ้งนมสด',
  status: 'PREPARING', startedBy: 'user-1',
  records: [], ingredients: [],
}

describe('ProductionService', () => {
  let service: ProductionService

  const mockPrisma = {
    batch: {
      findUnique: jest.fn(),
      findMany:   jest.fn(),
      create:     jest.fn(),
      update:     jest.fn(),
    },
    batchRecord:     { create: jest.fn() },
    batchIngredient: { create: jest.fn() },
    stockLot:        { findUnique: jest.fn() },
    $transaction: jest.fn(fn => fn(mockPrisma)),
  }
  const mockLogger = { business: jest.fn() }

  beforeEach(async () => {
    jest.clearAllMocks()
    const module = await Test.createTestingModule({
      providers: [
        ProductionService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: WHSMLogger,    useValue: mockLogger },
      ],
    }).compile()
    service = module.get(ProductionService)
  })

  describe('createBatch', () => {
    it('should create batch with PREPARING status', async () => {
      mockPrisma.batch.create.mockResolvedValue({ ...mockBatch })
      const result = await service.createBatch({
        productCode: 'PROD-001', productName: 'หมูปิ้งนมสด', startedBy: 'user-1',
      })
      expect(mockPrisma.batch.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: 'PREPARING' }),
        })
      )
      expect(result.status).toBe('PREPARING')
    })
  })

  describe('recordPrepare', () => {
    it('should record stage and advance to MIXING', async () => {
      mockPrisma.batch.findUnique.mockResolvedValue({ ...mockBatch, status: 'PREPARING' })
      mockPrisma.batchRecord.create.mockResolvedValue({ id: 'rec-1', stage: 'PREPARE' })
      mockPrisma.batch.update.mockResolvedValue({ ...mockBatch, status: 'MIXING' })

      await service.recordPrepare('BATCH-20260921-0001', {
        goodQty: 280, wasteQty: 5, unit: 'kg', performedBy: 'user-1',
      })
      expect(mockPrisma.batch.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { status: 'MIXING' } })
      )
    })

    it('should throw if batch not in PREPARING status', async () => {
      mockPrisma.batch.findUnique.mockResolvedValue({ ...mockBatch, status: 'MIXING' })
      await expect(service.recordPrepare('BATCH-20260921-0001', {
        goodQty: 280, wasteQty: 5, unit: 'kg', performedBy: 'user-1',
      })).rejects.toThrow(BadRequestException)
    })
  })

  describe('recordPack', () => {
    it('should throw if blastMode not provided', async () => {
      mockPrisma.batch.findUnique.mockResolvedValue({ ...mockBatch, status: 'PACKING' })
      await expect(service.recordPack('BATCH-20260921-0001', {
        goodQty: 275, wasteQty: 5, unit: 'kg', performedBy: 'user-1',
      })).rejects.toThrow(BadRequestException)
    })

    it('should complete batch after packing', async () => {
      mockPrisma.batch.findUnique.mockResolvedValue({ ...mockBatch, status: 'PACKING' })
      mockPrisma.batchRecord.create.mockResolvedValue({ id: 'rec-4', stage: 'PACK' })
      mockPrisma.batch.update.mockResolvedValue({ ...mockBatch, status: 'COMPLETED' })

      await service.recordPack('BATCH-20260921-0001', {
        goodQty: 275, wasteQty: 5, unit: 'kg',
        performedBy: 'user-1', blastMode: 'BLAST',
      })
      expect(mockPrisma.batch.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: 'COMPLETED' }),
        })
      )
    })
  })
})