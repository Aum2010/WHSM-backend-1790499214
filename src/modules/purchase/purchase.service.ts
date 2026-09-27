import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common'
import { PoStatus } from '@prisma/client'
import { PrismaService } from '../../prisma/prisma.service'
import { WHSMLogger }   from '../../logger/logger.service'
import { CreatePoDto }       from './dto/create-po.dto'
import { UpdatePoStatusDto } from './dto/update-po-status.dto'

@Injectable()
export class PurchaseService {
  constructor(
    private prisma: PrismaService,
    private logger: WHSMLogger,
  ) {}

  // ── GET ──────────────────────────────────────────────
  getPOs(status?: PoStatus) {
    return this.prisma.poDocument.findMany({
      where:   status ? { status } : undefined,
      include: { items: true },
      orderBy: { createdAt: 'desc' },
    })
  }

  async getPO(poNo: string) {
    const po = await this.prisma.poDocument.findUnique({
      where:   { poNo },
      include: { items: true },
    })
    if (!po) throw new NotFoundException(`ไม่พบ PO: ${poNo}`)
    return po
  }

  // ── สร้าง PO ──────────────────────────────────────────
  // Body: { supplierCode, supplierName, createdBy, expectedDate?, note?, items[] }
  async createPO(dto: CreatePoDto) {
    const year = new Date().getFullYear()
    const poNo = `PO-${year}-${Date.now().toString().slice(-4)}`

    this.logger.business('CREATE_PO', `Purchase Order ${poNo} created`, { ...dto })

    return this.prisma.poDocument.create({
      data: {
        poNo,
        supplierCode: dto.supplierCode,
        supplierName: dto.supplierName,
        createdBy:    dto.createdBy,
        expectedDate: dto.expectedDate ? new Date(dto.expectedDate) : undefined,
        note:         dto.note,
        status:       'PENDING',
        items: {
          create: dto.items.map(i => ({
            materialCode: i.materialCode,
            materialName: i.materialName,
            quantity:     i.quantity.toString(),
            unit:         i.unit,
          })),
        },
      },
      include: { items: true },
    })
  }

  // ── Approve PO ────────────────────────────────────────
  async approvePO(poNo: string) {
    const po = await this.getPO(poNo)
    if (po.status !== 'PENDING')
      throw new BadRequestException(`PO ${poNo} ไม่ได้อยู่ในสถานะ PENDING`)

    this.logger.business('APPROVE_PO', `PO ${poNo} approved`, { poNo })
    return this.prisma.poDocument.update({
      where: { poNo },
      data:  { status: 'APPROVED' },
      include: { items: true },
    })
  }

  // ── Mark as Shipped (Supplier ส่งของแล้ว) ────────────
  async markShipped(poNo: string) {
    const po = await this.getPO(poNo)
    if (po.status !== 'APPROVED')
      throw new BadRequestException(`PO ${poNo} ต้อง Approve ก่อน`)

    this.logger.business('PO_SHIPPED', `PO ${poNo} shipped by supplier`, { poNo })
    return this.prisma.poDocument.update({
      where: { poNo },
      data:  { status: 'SHIPPED' },
      include: { items: true },
    })
  }

  // ── Mark as Received (รับของเข้าแล้ว) ────────────────
  async markReceived(poNo: string) {
    const po = await this.getPO(poNo)
    if (po.status !== 'SHIPPED')
      throw new BadRequestException(`PO ${poNo} ต้องอยู่ในสถานะ SHIPPED ก่อน`)

    this.logger.business('PO_RECEIVED', `PO ${poNo} received`, { poNo })
    return this.prisma.poDocument.update({
      where: { poNo },
      data:  { status: 'RECEIVED', receivedAt: new Date() },
      include: { items: true },
    })
  }

  // ── Cancel PO ─────────────────────────────────────────
  async cancelPO(poNo: string) {
    const po = await this.getPO(poNo)
    if (['RECEIVED', 'CANCELLED'].includes(po.status))
      throw new BadRequestException(`ไม่สามารถยกเลิก PO ${poNo} ได้`)

    this.logger.business('CANCEL_PO', `PO ${poNo} cancelled`, { poNo })
    return this.prisma.poDocument.update({
      where: { poNo },
      data:  { status: 'CANCELLED' },
      include: { items: true },
    })
  }
}