import {
  Injectable, NotFoundException, BadRequestException, Logger,
} from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'
import { CreateBatchDto } from './dto/create-batch.dto'
import { RecordStageDto } from './dto/record-stage.dto'
import { AddIngredientDto } from './dto/add-ingredient.dto'

@Injectable()
export class ProductionService {
  private readonly logger = new Logger(ProductionService.name)

  constructor(private prisma: PrismaService) {}

  // ─── Auto-gen lotNo for Batch ─────────────────────────────────────
  private async generateLotNo(): Promise<string> {
    const date = new Date()
    const yyyymmdd = `${date.getFullYear()}${String(date.getMonth()+1).padStart(2,'0')}${String(date.getDate()).padStart(2,'0')}`
    const count = await this.prisma.batch.count()
    return `LOT-${yyyymmdd}-${String(count + 1).padStart(4, '0')}`
  }

  // ─── getBatch by lotNo ────────────────────────────────────────────
  async getBatch(lotNo: string) {
    const batch = await this.prisma.batch.findUnique({
      where: { lotNo },
      include: {
        ingredients: { include: { stock: true } },
        records: { orderBy: { createdAt: 'asc' } },
        recipe: { include: { items: true } },
      },
    })
    if (!batch) throw new NotFoundException(`ไม่พบ Batch: ${lotNo}`)
    return batch
  }

  // ─── List batches ─────────────────────────────────────────────────
  async listBatches(status?: string) {
    return this.prisma.batch.findMany({
      where: status ? { status: status as any } : undefined,
      include: {
        ingredients: { include: { stock: true } },
        records: true,
      },
      orderBy: { createdAt: 'desc' },
    })
  }

  // ─── Create Batch ─────────────────────────────────────────────────
  async createBatch(dto: CreateBatchDto) {
    const lotNo = await this.generateLotNo()
    this.logger.log(`Creating batch lotNo=${lotNo}`)
    return this.prisma.batch.create({
      data: {
        lotNo,
        productCode: dto.productCode,
        productName: dto.productName,
        recipeId: dto.recipeId ?? null,
        startedBy: dto.startedBy,
        status: 'PREPARING',
      },
    })
  }

  // ─── Add Ingredient to Batch ──────────────────────────────────────
  async addIngredient(lotNo: string, dto: AddIngredientDto) {
    const batch = await this.getBatch(lotNo)
    if (!['PREPARING'].includes(batch.status))
      throw new BadRequestException('เพิ่มส่วนประกอบได้เฉพาะ status PREPARING')

    // ตรวจสอบ rmNo มีในคลัง
    const stock = await this.prisma.stockLot.findUnique({ where: { rmNo: dto.rmNo } })
    if (!stock) throw new NotFoundException(`ไม่พบ RM: ${dto.rmNo}`)
    if (stock.status !== 'AVAILABLE')
      throw new BadRequestException(`RM ${dto.rmNo} ไม่ได้อยู่ในสถานะ AVAILABLE`)
    if (Number(stock.remainingQty) < dto.actualQty)
      throw new BadRequestException(`RM ${dto.rmNo} มีเพียง ${stock.remainingQty} ${stock.unit}`)

    return this.prisma.$transaction(async tx => {
      // ตัด remainingQty
      await tx.stockLot.update({
        where: { rmNo: dto.rmNo },
        data: { remainingQty: { decrement: dto.actualQty } },
      })
      // บันทึก RM transaction
      await tx.stockTransaction.create({
        data: {
          rmNo: dto.rmNo,
          transactionType: 'RM',
          documentNo: lotNo,
          quantity: dto.actualQty,
          unit: dto.unit,
          fromLocation: stock.location,
          performedBy: dto.performedBy,
          note: `เบิกใส่ Batch ${lotNo}`,
        },
      })
      // บันทึก BatchIngredient
      return tx.batchIngredient.create({
        data: {
          batchId: batch.id,
          rmNo: dto.rmNo,
          plannedQty: dto.plannedQty,
          actualQty: dto.actualQty,
          unit: dto.unit,
        },
      })
    })
  }

  // ─── Stage 1: PREPARE ─────────────────────────────────────────────
  async recordPrepare(lotNo: string, dto: RecordStageDto) {
    const batch = await this.getBatch(lotNo)
    if (batch.status !== 'PREPARING')
      throw new BadRequestException(`Batch ไม่ได้อยู่ใน stage PREPARING`)

    return this.prisma.$transaction(async tx => {
      const record = await tx.batchRecord.create({
        data: {
          batchId: batch.id,
          stage: 'PREPARE',
          goodQty: dto.goodQty,
          wasteQty: dto.wasteQty ?? 0,
          unit: dto.unit,
          startTime: dto.startTime ? new Date(dto.startTime) : new Date(),
          endTime: dto.endTime ? new Date(dto.endTime) : null,
          performedBy: dto.performedBy,
          note: dto.note,
        },
      })
      await tx.batch.update({
        where: { lotNo },
        data: { status: 'MIXING', startedAt: new Date() },
      })
      return record
    })
  }

  // ─── Stage 2: MIX ─────────────────────────────────────────────────
  async recordMix(lotNo: string, dto: RecordStageDto) {
    const batch = await this.getBatch(lotNo)
    if (batch.status !== 'MIXING')
      throw new BadRequestException(`Batch ไม่ได้อยู่ใน stage MIXING`)

    return this.prisma.$transaction(async tx => {
      const record = await tx.batchRecord.create({
        data: {
          batchId: batch.id,
          stage: 'MIX',
          goodQty: dto.goodQty,
          wasteQty: dto.wasteQty ?? 0,
          unit: dto.unit,
          startTime: dto.startTime ? new Date(dto.startTime) : new Date(),
          endTime: dto.endTime ? new Date(dto.endTime) : null,
          performedBy: dto.performedBy,
          note: dto.note,
        },
      })
      await tx.batch.update({ where: { lotNo }, data: { status: 'SKEWERING' } })
      return record
    })
  }

  // ─── Stage 3: SKEWER ──────────────────────────────────────────────
  async recordSkewer(lotNo: string, dto: RecordStageDto) {
    const batch = await this.getBatch(lotNo)
    if (batch.status !== 'SKEWERING')
      throw new BadRequestException(`Batch ไม่ได้อยู่ใน stage SKEWERING`)

    return this.prisma.$transaction(async tx => {
      const record = await tx.batchRecord.create({
        data: {
          batchId: batch.id,
          stage: 'SKEWER',
          goodQty: dto.goodQty,
          wasteQty: dto.wasteQty ?? 0,
          unit: dto.unit,
          startTime: dto.startTime ? new Date(dto.startTime) : new Date(),
          endTime: dto.endTime ? new Date(dto.endTime) : null,
          performedBy: dto.performedBy,
          note: dto.note,
        },
      })
      await tx.batch.update({ where: { lotNo }, data: { status: 'PACKING' } })
      return record
    })
  }

  // ─── Stage 4: PACK ────────────────────────────────────────────────
  async recordPack(lotNo: string, dto: RecordStageDto) {
    const batch = await this.getBatch(lotNo)
    if (batch.status !== 'PACKING')
      throw new BadRequestException(`Batch ไม่ได้อยู่ใน stage PACKING`)

    return this.prisma.$transaction(async tx => {
      const record = await tx.batchRecord.create({
        data: {
          batchId: batch.id,
          stage: 'PACK',
          goodQty: dto.goodQty,
          wasteQty: dto.wasteQty ?? 0,
          unit: dto.unit,
          blastMode: dto.blastMode ?? null,
          startTime: dto.startTime ? new Date(dto.startTime) : new Date(),
          endTime: dto.endTime ? new Date(dto.endTime) : null,
          performedBy: dto.performedBy,
          note: dto.note,
        },
      })
      await tx.batch.update({
        where: { lotNo },
        data: { status: 'COMPLETED', completedAt: new Date() },
      })
      return record
    })
  }

  // ─── Cancel Batch ─────────────────────────────────────────────────
  async cancelBatch(lotNo: string, performedBy: string) {
    const batch = await this.getBatch(lotNo)
    if (batch.status === 'COMPLETED')
      throw new BadRequestException('ไม่สามารถยกเลิก Batch ที่เสร็จแล้ว')

    // คืน remainingQty ของ RM ที่เบิกไปแล้ว
    return this.prisma.$transaction(async tx => {
      for (const ing of batch.ingredients) {
        await tx.stockLot.update({
          where: { rmNo: ing.rmNo },
          data: { remainingQty: { increment: Number(ing.actualQty) } },
        })
      }
      return tx.batch.update({ where: { lotNo }, data: { status: 'CANCELLED' } })
    })
  }
}