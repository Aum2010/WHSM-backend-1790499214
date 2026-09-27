import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common'
import { LotStatus, TxType } from '@prisma/client'
import { PrismaService } from '../../prisma/prisma.service'
import { WHSMLogger }   from '../../logger/logger.service'
import { CreateRoDto }   from './dto/create-ro.dto'
import { CreateRmDto }   from './dto/create-rm.dto'
import { CreateFgtDto }  from './dto/create-fgt.dto'
import { DispatchSoDto } from './dto/dispatch-so.dto'
import { ReturnWhrmDto } from './dto/return-whrm.dto'

@Injectable()
export class InventoryService {
  constructor(
    private prisma: PrismaService,
    private logger: WHSMLogger,
  ) {}

  getLots(status?: LotStatus) {
    return this.prisma.stockLot.findMany({
      where: status
        ? { status }
        : { status: { not: 'EXPIRED' } },
      orderBy: [{ expiryDate: 'asc' }, { createdAt: 'asc' }],
    })
  }

  async getLot(rmNo: string) {
    const lot = await this.prisma.stockLot.findUnique({ where: { rmNo } })
    if (!lot) throw new NotFoundException(`ไม่พบ RM: ${rmNo}`)
    return lot
  }

  // ── Transaction Ledger ──────────────────────────────
  async getTransactions(query: {
    rmNo?:  string
    type?:  string
    from?:  string
    to?:    string
    page?:  number
    limit?: number
  }) {
    const page  = Number(query.page)  || 1
    const limit = Number(query.limit) || 50
    const skip  = (page - 1) * limit

    const where: any = {}
    if (query.rmNo) where.rmNo = { contains: query.rmNo }
    if (query.type) where.transactionType = query.type
    if (query.from || query.to) {
      where.createdAt = {}
      if (query.from) where.createdAt.gte = new Date(query.from)
      if (query.to)   where.createdAt.lte = new Date(query.to)
    }

    const [data, total] = await Promise.all([
      this.prisma.stockTransaction.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: { lot: { select: { materialName: true, materialCode: true, poNo: true } } },
      }),
      this.prisma.stockTransaction.count({ where }),
    ])

    return { data, total, page, limit }
  }

  // ── Auto-generate RM Number ─────────────────────────
  private async generateRmNo(): Promise<string> {
    const date  = new Date()
    const yyyymmdd = `${date.getFullYear()}${String(date.getMonth()+1).padStart(2,'0')}${String(date.getDate()).padStart(2,'0')}`
    const count = await this.prisma.stockLot.count()
    return `RM-${yyyymmdd}-${String(count + 1).padStart(4, '0')}`
  }

  // ── RO: รับวัตถุดิบเข้า ──────────────────────────────
  async createRO(dto: CreateRoDto) {
    const rmNo = await this.generateRmNo()
    const qty  = dto.quantity.toString()
    this.logger.business('CREATE_RO', `RO: ${rmNo} | ${dto.materialCode}`, { ...dto })
    return this.prisma.stockLot.create({
      data: {
        rmNo,
        materialCode: dto.materialCode,
        materialName: dto.materialName,
        quantity:     qty,
        remainingQty: qty,
        unit:         dto.unit,
        location:     dto.location,
        receivedBy:   dto.receivedBy,
        poNo:         dto.poNo,
        supplierCode: dto.supplierCode,
        expiryDate:   dto.expiryDate ? new Date(dto.expiryDate) : undefined,
        status:       'AVAILABLE',
      },
    })
  }

  // ── RM: เบิกวัตถุดิบ FEFO ────────────────────────────
  async createRM(dto: CreateRmDto) {
    const qty = Number(dto.quantity)
    const lot = await this.prisma.stockLot.findFirst({
      where:   { materialCode: dto.materialCode, status: 'AVAILABLE', location: dto.location },
      orderBy: [{ expiryDate: 'asc' }, { createdAt: 'asc' }],
    })
    if (!lot) throw new NotFoundException('ไม่พบ stock วัตถุดิบที่ต้องการ')
    if (Number(lot.remainingQty) < qty)
      throw new BadRequestException(`Stock ไม่พอ: มี ${lot.remainingQty} ต้องการ ${qty}`)

    this.logger.business('CREATE_RM', `RM FEFO: ${lot.rmNo} -${qty}`, { ...dto })
    return this.prisma.$transaction(async tx => {
      await tx.stockLot.update({
        where: { rmNo: lot.rmNo },
        data:  { remainingQty: { decrement: qty.toString() } },
      })
      return tx.stockTransaction.create({
        data: {
          rmNo:            lot.rmNo,
          transactionType: TxType.RM,
          documentNo:      `RM-${Date.now()}`,
          quantity:        qty.toString(),
          unit:            dto.unit,
          fromLocation:    dto.location,
          toLocation:      'MES-Line-01',
          performedBy:     dto.performedBy,
        },
      })
    })
  }

  // ── FGT: โอนย้าย ─────────────────────────────────────
  async createFGT(dto: CreateFgtDto) {
    const qty = Number(dto.quantity)
    const lot = await this.getLot(dto.rmNo)
    if (lot.status === 'HOLD')
      throw new BadRequestException(`ไม่สามารถโอนย้ายได้ — RM ${dto.rmNo} ถูกกักกัน`)

    this.logger.business('CREATE_FGT', `FGT: ${dto.rmNo} → ${dto.toLocation}`, { ...dto })
    return this.prisma.$transaction(async tx => {
      await tx.stockLot.update({
        where: { rmNo: dto.rmNo },
        data:  { location: dto.toLocation },
      })
      return tx.stockTransaction.create({
        data: {
          rmNo:            dto.rmNo,
          transactionType: TxType.FGT,
          documentNo:      `FGT-${Date.now()}`,
          quantity:        qty.toString(),
          unit:            dto.unit,
          fromLocation:    dto.fromLocation,
          toLocation:      dto.toLocation,
          performedBy:     dto.performedBy,
        },
      })
    })
  }

  async holdLot(rmNo: string, reason: string, holdBy: string) {
    await this.getLot(rmNo)
    this.logger.business('HOLD_LOT', `RM ${rmNo} held`, { rmNo, reason, holdBy })
    return this.prisma.stockLot.update({
      where: { rmNo },
      data:  { status: 'HOLD', holdReason: reason, holdBy, holdAt: new Date() },
    })
  }

  async releaseLot(rmNo: string) {
    this.logger.business('RELEASE_LOT', `RM ${rmNo} released`, { rmNo })
    return this.prisma.stockLot.update({
      where: { rmNo },
      data:  { status: 'AVAILABLE', holdReason: null, holdBy: null, holdAt: null },
    })
  }

  // ── SO Dispatch ───────────────────────────────────────
  async dispatchSO(dto: DispatchSoDto) {
    const qty = Number(dto.quantity)
    const lot = await this.getLot(dto.rmNo)

    const sysHold = await this.prisma.systemHold.findUnique({ where: { id: 'singleton' } })
    if (sysHold?.isActive)
      throw new BadRequestException('ไม่สามารถตัดจ่ายได้ — ระบบถูก HOLD ทั้งหมด')
    if (lot.status === 'HOLD')
      throw new BadRequestException(`ไม่สามารถจ่ายได้ — RM ${dto.rmNo} ถูกกักกัน`)
    if (Number(lot.remainingQty) < qty)
      throw new BadRequestException(`Stock ไม่พอ: มี ${lot.remainingQty} ต้องการ ${qty}`)

    this.logger.business('SO_DISPATCH', `SO dispatch: ${dto.rmNo} -${qty}`, { ...dto })
    return this.prisma.$transaction(async tx => {
      await tx.stockLot.update({
        where: { rmNo: dto.rmNo },
        data:  { remainingQty: { decrement: qty.toString() } },
      })
      return tx.stockTransaction.create({
        data: {
          rmNo:            dto.rmNo,
          transactionType: TxType.SO_DISPATCH,
          documentNo:      dto.soNo,
          quantity:        qty.toString(),
          unit:            dto.unit,
          fromLocation:    lot.location,
          toLocation:      'Vendor',
          performedBy:     dto.performedBy,
        },
      })
    })
  }

  // ── Return WHRM ───────────────────────────────────────
  async returnToWHRM(dto: ReturnWhrmDto) {
    const qty = Number(dto.quantity)
    await this.getLot(dto.rmNo)

    this.logger.business('RETURN_WHRM', `Return ${qty} of ${dto.rmNo}`, { ...dto })
    return this.prisma.$transaction(async tx => {
      await tx.stockLot.update({
        where: { rmNo: dto.rmNo },
        data:  { location: 'Zone-RM-01', remainingQty: { increment: qty.toString() } },
      })
      return tx.stockTransaction.create({
        data: {
          rmNo:            dto.rmNo,
          transactionType: TxType.RETURN_WHRM,
          documentNo:      `RET-${Date.now()}`,
          quantity:        qty.toString(),
          unit:            dto.unit,
          fromLocation:    'MES-Line-01',
          toLocation:      'Zone-RM-01',
          performedBy:     dto.performedBy,
        },
      })
    })
  }

  // ── Update Lot ────────────────────────────────────────
  async updateLot(rmNo: string, dto: {
    materialName?: string
    materialCode?: string
    location?:     string
    expiryDate?:   string
    supplierCode?: string
    poNo?:         string
    status?:       string
  }) {
    await this.getLot(rmNo)
    this.logger.business('UPDATE_LOT', `RM ${rmNo} updated`, { rmNo, ...dto })
    return this.prisma.stockLot.update({
      where: { rmNo },
      data: {
        materialName: dto.materialName,
        materialCode: dto.materialCode,
        location:     dto.location,
        supplierCode: dto.supplierCode,
        poNo:         dto.poNo,
        status:       dto.status as any,
        expiryDate:   dto.expiryDate ? new Date(dto.expiryDate) : undefined,
      },
    })
  }
}