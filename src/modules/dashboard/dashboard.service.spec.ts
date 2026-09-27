import { Test } from '@nestjs/testing'
import { DashboardService } from './dashboard.service'
import { PrismaService }    from '../../prisma/prisma.service'
import { WHSMLogger }       from '../../logger/logger.service'

describe('DashboardService', () => {
  let service: DashboardService

  const mockPrisma = {
    stockLot:         { count: jest.fn(), groupBy: jest.fn(), findUnique: jest.fn() },
    batch:            { count: jest.fn(), findMany: jest.fn() },
    soDocument:       { count: jest.fn() },
    poDocument:       { count: jest.fn() },
    deviationReport:  { count: jest.fn(), findMany: jest.fn() },
    systemHold:       { findUnique: jest.fn() },
    systemLog:        { findMany: jest.fn(), count: jest.fn() },
    stockTransaction: { findMany: jest.fn() },
    batchIngredient:  { findMany: jest.fn() },
  }
  const mockLogger = { business: jest.fn() }

  beforeEach(async () => {
    jest.clearAllMocks()
    const module = await Test.createTestingModule({
      providers: [
        DashboardService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: WHSMLogger,    useValue: mockLogger },
      ],
    }).compile()
    service = module.get(DashboardService)
  })

  describe('getKPI', () => {
    it('should return KPI from all modules', async () => {
      mockPrisma.stockLot.count.mockResolvedValue(10)
      mockPrisma.batch.count.mockResolvedValue(3)
      mockPrisma.soDocument.count.mockResolvedValue(5)
      mockPrisma.poDocument.count.mockResolvedValue(2)
      mockPrisma.deviationReport.count.mockResolvedValue(1)
      mockPrisma.systemHold.findUnique.mockResolvedValue({ isActive: false, reason: null })

      const result = await service.getKPI()
      expect(result).toHaveProperty('inventory')
      expect(result).toHaveProperty('production')
      expect(result).toHaveProperty('order')
      expect(result).toHaveProperty('purchase')
      expect(result).toHaveProperty('qa')
      expect(result.qa.systemOnHold).toBe(false)
    })
  })

  describe('queryLogs', () => {
    it('should return paginated logs', async () => {
      mockPrisma.systemLog.findMany.mockResolvedValue([{ id: 1, action: 'CREATE_RO' }])
      mockPrisma.systemLog.count.mockResolvedValue(1)

      const result = await service.queryLogs({ page: 1, limit: 20 })
      expect(result.total).toBe(1)
      expect(result.page).toBe(1)
      expect(result.data).toHaveLength(1)
    })

    it('should filter by lotNo', async () => {
      mockPrisma.systemLog.findMany.mockResolvedValue([])
      mockPrisma.systemLog.count.mockResolvedValue(0)

      const result = await service.queryLogs({ lotNo: '01092026/001' })
      expect(mockPrisma.systemLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            lotNo: { contains: '01092026/001' },
          }),
        })
      )
    })
  })

  describe('traceLot', () => {
    it('should return full traceability data', async () => {
      mockPrisma.stockLot.findUnique.mockResolvedValue({ lotNo: '01092026/001' })
      mockPrisma.stockTransaction.findMany.mockResolvedValue([{ id: 'tx-1' }])
      mockPrisma.batchIngredient.findMany.mockResolvedValue([])
      mockPrisma.deviationReport.findMany.mockResolvedValue([])

      const result = await service.traceLot('01092026/001')
      expect(result).toHaveProperty('lot')
      expect(result).toHaveProperty('transactions')
      expect(result).toHaveProperty('batchUsages')
      expect(result).toHaveProperty('deviations')
      expect(result.transactions).toHaveLength(1)
    })
  })
})