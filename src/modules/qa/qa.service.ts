import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common'
import { PrismaService }    from '../../prisma/prisma.service'
import { WHSMLogger }       from '../../logger/logger.service'
import { CreateDeviationDto }  from './dto/create-deviation.dto'
import { ResolveDeviationDto } from './dto/resolve-deviation.dto'
import { SystemHoldDto }       from './dto/system-hold.dto'

@Injectable()
export class QaService {
  constructor(
    private prisma: PrismaService,
    private logger: WHSMLogger,
  ) {}

  getDeviations() {
    return this.prisma.deviationReport.findMany({
      orderBy: { createdAt: 'desc' },
    })
  }

  async getDeviation(reportNo: string) {
    const report = await this.prisma.deviationReport.findUnique({ where: { reportNo } })
    if (!report) throw new NotFoundException(`ไม่พบ Deviation: ${reportNo}`)
    return report
  }

  async createDeviationAndHold(dto: CreateDeviationDto) {
    const lot = await this.prisma.stockLot.findUnique({ where: { rmNo: dto.rmNo } })
    if (!lot) throw new NotFoundException(`ไม่พบ RM: ${dto.rmNo}`)
    if (lot.status === 'HOLD')
      throw new BadRequestException(`RM ${dto.rmNo} ถูกกักกันอยู่แล้ว`)

    const reportNo = `DEV-${new Date().toISOString().slice(0,10).replace(/-/g,'')}-${Date.now().toString().slice(-4)}`
    this.logger.business('CREATE_DEVIATION', `Deviation ${reportNo} — RM ${dto.rmNo}`, { ...dto })

    return this.prisma.$transaction(async tx => {
      const report = await tx.deviationReport.create({
        data: {
          reportNo,
          rmNo:        dto.rmNo,
          description: dto.description,
          reportedBy:  dto.reportedBy,
          status:      'OPEN',
        },
      })
      await tx.stockLot.update({
        where: { rmNo: dto.rmNo },
        data: {
          status:     'HOLD',
          holdReason: dto.description,
          holdBy:     dto.reportedBy,
          holdAt:     new Date(),
        },
      })
      return report
    })
  }

  async releaseLot(rmNo: string, dto: ResolveDeviationDto) {
    const lot = await this.prisma.stockLot.findUnique({ where: { rmNo } })
    if (!lot) throw new NotFoundException(`ไม่พบ RM: ${rmNo}`)
    if (lot.status !== 'HOLD')
      throw new BadRequestException(`RM ${rmNo} ไม่ได้ถูกกักกัน`)

    this.logger.business('RELEASE_LOT', `QA released RM ${rmNo}`, { rmNo, ...dto })

    return this.prisma.$transaction(async tx => {
      await tx.stockLot.update({
        where: { rmNo },
        data:  { status: 'AVAILABLE', holdReason: null, holdBy: null, holdAt: null },
      })
      await tx.deviationReport.updateMany({
        where: { rmNo, status: 'OPEN' },
        data: {
          status:     'CLOSED',
          resolvedBy: dto.resolvedBy,
          resolvedAt: new Date(),
          resolution: dto.resolution,
        },
      })
      return { message: `RM ${rmNo} ปลดล็อคแล้ว` }
    })
  }

  async approveRework(rmNo: string, dto: ResolveDeviationDto) {
    const lot = await this.prisma.stockLot.findUnique({ where: { rmNo } })
    if (!lot) throw new NotFoundException(`ไม่พบ RM: ${rmNo}`)
    if (lot.status !== 'HOLD')
      throw new BadRequestException(`RM ${rmNo} ไม่ได้ถูกกักกัน`)

    const report = await this.prisma.deviationReport.findFirst({
      where: { rmNo, status: 'OPEN' },
    })
    if (!report) throw new NotFoundException('ไม่พบ Deviation report ที่ open อยู่')

    this.logger.business('APPROVE_REWORK', `RM ${rmNo} → Rework`, { rmNo })

    return this.prisma.$transaction(async tx => {
      await tx.stockLot.update({ where: { rmNo }, data: { status: 'REWORK' } })
      await tx.deviationReport.update({
        where: { id: report.id },
        data: {
          status:      'APPROVED_REWORK',
          reworkCount: { increment: 1 },
          resolvedBy:  dto.resolvedBy,
          resolution:  dto.resolution,
        },
      })
      return { message: `RM ${rmNo} ส่ง Rework แล้ว (ครั้งที่ ${report.reworkCount + 1})` }
    })
  }

  async toggleSystemHold(dto: SystemHoldDto) {
    this.logger.business(
      dto.hold ? 'SYSTEM_HOLD_ON' : 'SYSTEM_HOLD_OFF',
      dto.hold ? `System HOLD: ${dto.reason}` : 'System HOLD released',
    )
    return this.prisma.systemHold.update({
      where: { id: 'singleton' },
      data: {
        isActive:    dto.hold,
        reason:      dto.hold ? dto.reason : null,
        activatedBy: dto.hold ? dto.activatedBy : null,
        activatedAt: dto.hold ? new Date() : null,
      },
    })
  }

  getSystemHoldStatus() {
    return this.prisma.systemHold.findUnique({ where: { id: 'singleton' } })
  }
}