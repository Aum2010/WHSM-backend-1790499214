import { Injectable } from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  async getKpi() {
    const [
      totalStock,
      holdCount,
      expiryCount,
      activeBatches,
      pendingSo,
      pendingPo,
      openDeviations,
    ] = await Promise.all([
      this.prisma.stockLot.count({ where: { status: 'AVAILABLE' } }),
      this.prisma.stockLot.count({ where: { status: 'HOLD' } }),
      this.prisma.stockLot.count({
        where: {
          status: 'AVAILABLE',
          expiryDate: { lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) },
        },
      }),
      this.prisma.batch.count({
        where: { status: { notIn: ['COMPLETED', 'CANCELLED'] } },
      }),
      this.prisma.soDocument.count({ where: { status: { in: ['PENDING', 'CONFIRMED', 'IN_PRODUCTION'] } } }),
      this.prisma.poDocument.count({ where: { status: { in: ['PENDING', 'APPROVED'] } } }),
      this.prisma.deviationReport.count({ where: { status: { in: ['OPEN', 'APPROVED_REWORK'] } } }),
    ])

    return {
      inventory: { totalStock, holdCount, expiryCount },
      production: { activeBatches },
      orders: { pendingSo, pendingPo },
      qa: { openDeviations },
    }
  }

  async getRecentTransactions(limit = 20) {
    return this.prisma.stockTransaction.findMany({
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: { lot: { select: { rmNo: true, materialName: true } } },
    })
  }

  async getStockSummary() {
    const lots = await this.prisma.stockLot.findMany({
      where: { status: { not: 'EXPIRED' } },
      select: {
        rmNo: true,
        materialCode: true,
        materialName: true,
        remainingQty: true,
        unit: true,
        status: true,
        location: true,
        expiryDate: true,
      },
      orderBy: { expiryDate: { sort: 'asc', nulls: 'last' } },
    })
    return lots
  }

  async getProductionSummary() {
    return this.prisma.batch.findMany({
      where: { status: { notIn: ['COMPLETED', 'CANCELLED'] } },
      include: {
        ingredients: { include: { stock: { select: { rmNo: true, materialName: true } } } },
        records: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
      orderBy: { createdAt: 'desc' },
    })
  }

  async getTrace(rmNo: string) {
    const lot = await this.prisma.stockLot.findUnique({
      where: { rmNo },
      include: {
        transactions: { orderBy: { createdAt: 'asc' } },
        batchUsages: {
          include: {
            batch: {
              select: { lotNo: true, productCode: true, productName: true, status: true, createdAt: true },
            },
          },
        },
      },
    })
    if (!lot) return null
    return lot
  }
}