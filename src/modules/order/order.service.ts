import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common'
import { SoStatus, OrderType } from '@prisma/client'
import { PrismaService } from '../../prisma/prisma.service'
import { WHSMLogger }   from '../../logger/logger.service'
import { CreateSoDto }       from './dto/create-so.dto'
import { ConfirmSoDto }      from './dto/confirm-so.dto'
import { UpdateSoStatusDto } from './dto/update-so-status.dto'

@Injectable()
export class OrderService {
  constructor(
    private prisma: PrismaService,
    private logger: WHSMLogger,
  ) {}

  // ── GET ──────────────────────────────────────────────
  getSOs(status?: SoStatus) {
    return this.prisma.soDocument.findMany({
      where:   status ? { status } : undefined,
      include: { items: true },
      orderBy: { createdAt: 'desc' },
    })
  }

  async getSO(soNo: string) {
    const so = await this.prisma.soDocument.findUnique({
      where:   { soNo },
      include: { items: true },
    })
    if (!so) throw new NotFoundException(`ไม่พบ SO: ${soNo}`)
    return so
  }

  // ── สร้าง SO ──────────────────────────────────────────
  // Body: { orderType, createdBy, customerId?, note?, items[] }
  async createSO(dto: CreateSoDto) {
    const year  = new Date().getFullYear()
    const soNo  = `SO-${year}-${Date.now().toString().slice(-4)}`

    this.logger.business('CREATE_SO', `Sale Order ${soNo} created`, { ...dto })

    return this.prisma.soDocument.create({
      data: {
        soNo,
        orderType: dto.orderType,
        createdBy: dto.createdBy,
        customerId: dto.customerId,
        note:       dto.note,
        status:     'PENDING',
        items: {
          create: dto.items.map(i => ({
            materialCode: i.materialCode,
            materialName: i.materialName,
            quantity:     i.quantity.toString(),
            unit:         i.unit,
            lotNo:        i.lotNo,
          })),
        },
      },
      include: { items: true },
    })
  }

  // ── WH Confirm SO ─────────────────────────────────────
  // Body: { confirmedBy }
  async confirmSO(soNo: string, dto: ConfirmSoDto) {
    const so = await this.getSO(soNo)
    if (so.status !== 'PENDING')
      throw new BadRequestException(`SO ${soNo} ไม่ได้อยู่ในสถานะ PENDING`)

    // ตรวจ system hold
    const sysHold = await this.prisma.systemHold.findUnique({ where: { id: 'singleton' } })
    if (sysHold?.isActive)
      throw new BadRequestException('ไม่สามารถ Confirm ได้ — ระบบถูก HOLD ทั้งหมด')

    this.logger.business('CONFIRM_SO', `SO ${soNo} confirmed by WH`, { soNo, ...dto })
    return this.prisma.soDocument.update({
      where: { soNo },
      data:  {
        status:      'CONFIRMED',
        confirmedBy: dto.confirmedBy,
        confirmedAt: new Date(),
      },
      include: { items: true },
    })
  }

  // ── MTO: ส่งไปผลิต ────────────────────────────────────
  async sendToProduction(soNo: string) {
    const so = await this.getSO(soNo)
    if (so.orderType !== OrderType.MTO)
      throw new BadRequestException(`SO ${soNo} ไม่ใช่ MTO order`)
    if (so.status !== 'CONFIRMED')
      throw new BadRequestException(`SO ${soNo} ต้อง Confirm ก่อนส่งผลิต`)

    this.logger.business('SO_TO_PRODUCTION', `SO ${soNo} → Production`, { soNo })
    return this.prisma.soDocument.update({
      where: { soNo },
      data:  { status: 'IN_PRODUCTION' },
      include: { items: true },
    })
  }

  // ── อัปเดต status ─────────────────────────────────────
  async updateStatus(soNo: string, dto: UpdateSoStatusDto) {
    await this.getSO(soNo)
    this.logger.business('UPDATE_SO_STATUS', `SO ${soNo} → ${dto.status}`, { soNo, ...dto })
    return this.prisma.soDocument.update({
      where: { soNo },
      data:  { status: dto.status },
      include: { items: true },
    })
  }

  // ── ยืนยันชำระเงิน ────────────────────────────────────
  async confirmPayment(soNo: string) {
    const so = await this.getSO(soNo)
    if (!['CONFIRMED', 'READY'].includes(so.status))
      throw new BadRequestException(`SO ${soNo} ต้องอยู่ในสถานะ CONFIRMED หรือ READY`)

    this.logger.business('SO_PAYMENT', `SO ${soNo} payment confirmed`, { soNo })
    return this.prisma.soDocument.update({
      where: { soNo },
      data:  { status: 'PAID', paidAt: new Date() },
      include: { items: true },
    })
  }

  // ── จัดส่ง ────────────────────────────────────────────
  async shipSO(soNo: string) {
    const so = await this.getSO(soNo)
    if (so.status !== 'PAID')
      throw new BadRequestException(`SO ${soNo} ต้องชำระเงินก่อนจัดส่ง`)

    this.logger.business('SO_SHIP', `SO ${soNo} shipped`, { soNo })
    return this.prisma.soDocument.update({
      where: { soNo },
      data:  { status: 'SHIPPED', shippedAt: new Date() },
      include: { items: true },
    })
  }
}