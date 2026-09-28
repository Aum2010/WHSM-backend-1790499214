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

  constructor(private prisma: PrismaService) { }

  private async generateLotNo(): Promise<string> {
    const date = new Date()
    const yyyymmdd = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}`
    const count = await this.prisma.batch.count()
    return `LOT-${yyyymmdd}-${String(count + 1).padStart(4, '0')}`
  }

  private async generateRmNo(): Promise<string> {
    const date = new Date()
    const yyyymmdd = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}`
    const count = await this.prisma.stockLot.count()
    return `RM-${yyyymmdd}-${String(count + 1).padStart(4, '0')}`
  }

  private async generateFgNo(): Promise<string> {
    const date = new Date()
    const yyyymmdd = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}`
    const count = await this.prisma.stockLot.count()
    return `FG-${yyyymmdd}-${String(count + 1).padStart(4, '0')}`
  }

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

  async createBatch(dto: CreateBatchDto) {
    const lotNo = await this.generateLotNo()
    this.logger.log(`Creating batch lotNo=${lotNo}`)
    return this.prisma.batch.create({
      data: {
        lotNo,
        productCode: dto.productCode,
        productName: dto.productName,
        recipeId: dto.recipeId,
        startedBy: dto.startedBy,
        status: 'PREPARING',
      },
    })
  }

  async addIngredient(lotNo: string, dto: AddIngredientDto) {
    const batch = await this.getBatch(lotNo)
    if (!['PREPARING'].includes(batch.status))
      throw new BadRequestException('เพิ่มส่วนประกอบได้เฉพาะ status PREPARING')

    const stock = await this.prisma.stockLot.findUnique({ where: { rmNo: dto.rmNo } })
    if (!stock) throw new NotFoundException(`ไม่พบ RM: ${dto.rmNo}`)
    if (stock.status !== 'AVAILABLE')
      throw new BadRequestException(`RM ${dto.rmNo} ไม่ได้อยู่ในสถานะ AVAILABLE`)
    if (Number(stock.remainingQty) < dto.actualQty)
      throw new BadRequestException(`RM ${dto.rmNo} มีเพียง ${stock.remainingQty} ${stock.unit}`)

    return this.prisma.$transaction(async tx => {
      await tx.stockLot.update({
        where: { rmNo: dto.rmNo },
        data: { remainingQty: { decrement: dto.actualQty } },
      })
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

  async recordPrepare(lotNo: string, dto: RecordStageDto) {
    const batch = await this.getBatch(lotNo)
    if (batch.status !== 'PREPARING')
      throw new BadRequestException(`Batch ไม่ได้อยู่ใน stage PREPARING`)

    // ถ้ามี ingredientWeights → ชั่งครบทุก ingredient ก่อนอนุญาต
    if (batch.ingredients.length > 0) {
      if (!dto.ingredientWeights || dto.ingredientWeights.length === 0)
        throw new BadRequestException('กรุณาชั่งน้ำหนักวัตถุดิบให้ครบก่อนบันทึก PREPARE')
      for (const w of dto.ingredientWeights) {
        const ing = batch.ingredients.find((i: any) => i.rmNo === w.rmNo)
        if (!ing) throw new BadRequestException(`ไม่พบ ingredient rmNo=${w.rmNo} ใน Batch นี้`)
      }
    }

    return this.prisma.$transaction(async tx => {
      // หักสต็อกจริงตามน้ำหนักที่ชั่ง
      if (dto.ingredientWeights && dto.ingredientWeights.length > 0) {
        await this.deductIngredients(tx, batch, dto.ingredientWeights, lotNo, dto.performedBy)
      }

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

  async recordPack(lotNo: string, dto: RecordStageDto) {
    const batch = await this.getBatch(lotNo)
    if (batch.status !== 'PACKING')
      throw new BadRequestException(`Batch ไม่ได้อยู่ใน stage PACKING`)

    // generate FG number ก่อน transaction (ต้องใช้ prisma.stockLot.count ซึ่ง tx ยังไม่รู้)
    const fgNo = await this.generateFgNo()

    return this.prisma.$transaction(async tx => {
      // 1. บันทึก PACK record
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

      // 2. COMPLETED batch
      await tx.batch.update({
        where: { lotNo },
        data: { status: 'COMPLETED', completedAt: new Date() },
      })

      // 3. สร้าง FG StockLot
      await tx.stockLot.create({
        data: {
          rmNo: fgNo,                      // ใช้ rmNo field เดิม ค่า prefix FG-
          materialCode: batch.productCode,
          materialName: batch.productName,
          quantity: dto.goodQty,
          remainingQty: dto.goodQty,
          unit: dto.unit,
          location: 'Zone-FG-01',
          status: 'AVAILABLE',
          poNo: lotNo,                     // reference กลับ batch
          receivedBy: dto.performedBy,
        },
      })

      // 4. StockTransaction: FGT (inbound FG)
      await tx.stockTransaction.create({
        data: {
          rmNo: fgNo,
          transactionType: 'FGT',
          documentNo: lotNo,
          quantity: dto.goodQty,
          unit: dto.unit,
          toLocation: 'Zone-FG-01',
          performedBy: dto.performedBy,
          note: `FG จาก Batch ${lotNo} | waste: ${dto.wasteQty ?? 0} ${dto.unit}`,
        },
      })

      return { record, fgNo }
    })
  }

  async cancelBatch(lotNo: string, performedBy: string) {
    const batch = await this.getBatch(lotNo)
    if (batch.status === 'COMPLETED')
      throw new BadRequestException('ไม่สามารถยกเลิก Batch ที่เสร็จแล้ว')

    return this.prisma.$transaction(async tx => {
      // คืน stock เฉพาะ ingredient ที่ถูกหักจริงแล้ว (actualQty > 0)
      // PREPARING ที่ยังไม่ผ่าน recordPrepare → actualQty = 0 → ไม่ต้องคืน
      for (const ing of batch.ingredients) {
        const actual = Number(ing.actualQty)
        if (actual > 0) {
          await tx.stockLot.update({
            where: { rmNo: ing.rmNo },
            data: { remainingQty: { increment: actual }, status: 'AVAILABLE' },
          })
        }
      }
      return tx.batch.update({ where: { lotNo }, data: { status: 'CANCELLED' } })
    })
  }

  // ── pick-from-recipe: READ-ONLY guideline (ไม่แตะ stock) ─────────────────
  // แค่ดูว่ามีของพอมั้ย และจะเบิก lot ไหนบ้าง (FEFO) เพื่อแสดงแผนให้พนักงาน
  // การหัก stock จริงเกิดที่ recordPrepare() หลังชั่งน้ำหนักแล้ว
  async pickFromRecipe(lotNo: string, performedBy: string) {
    const batch = await this.prisma.batch.findUnique({
      where: { lotNo },
      include: { ingredients: true },
    })
    if (!batch) throw new NotFoundException(`Batch ${lotNo} ไม่พบ`)
    if (batch.status !== 'PREPARING')
      throw new BadRequestException('เบิกได้เฉพาะ Batch ที่อยู่ในสถานะ PREPARING เท่านั้น')

    const recipe = await this.prisma.recipe.findUnique({
      where: { id: batch.recipeId },
      include: { items: true },
    })
    if (!recipe) throw new NotFoundException('Recipe ไม่พบ')

    const results: Array<{
      materialCode: string
      materialName: string
      unit: string
      neededQty: number
      availableQty: number
      lots: Array<{ rmNo: string; qty: number; expiryDate: Date | null }>
      shortage: number
    }> = []

    // ลบ ingredient เก่าครั้งเดียวก่อน loop (ถ้า pick ซ้ำ)
    await this.prisma.batchIngredient.deleteMany({ where: { batchId: batch.id } })

    for (const item of recipe.items) {
      const neededQty = Number(item.quantity)

      const availableLots = await this.prisma.stockLot.findMany({
        where: {
          materialCode: item.materialCode,
          status: 'AVAILABLE',
          remainingQty: { gt: 0 },
        },
        orderBy: { expiryDate: 'asc' },
      })

      // FEFO: null expiryDate ไว้ท้าย
      const sortedLots = [
        ...availableLots.filter((l) => l.expiryDate !== null),
        ...availableLots.filter((l) => l.expiryDate === null),
      ]

      const totalAvailable = sortedLots.reduce((s, l) => s + Number(l.remainingQty), 0)

      // จำลอง FEFO plan โดยไม่แตะ DB
      let remaining = neededQty
      const plannedLots: Array<{ rmNo: string; qty: number; expiryDate: Date | null }> = []
      for (const lot of sortedLots) {
        if (remaining <= 0) break
        const take = Math.min(remaining, Number(lot.remainingQty))
        plannedLots.push({ rmNo: lot.rmNo, qty: take, expiryDate: lot.expiryDate })
        remaining -= take
      }

      // สร้าง BatchIngredient แบบ plannedQty เท่านั้น (actualQty = 0 รอชั่งจริง)
      for (const plan of plannedLots) {
        await this.prisma.batchIngredient.create({
          data: {
            batchId: batch.id,
            rmNo: plan.rmNo,
            plannedQty: plan.qty,
            actualQty: 0,          // จะอัปเดตตอนชั่งจริงใน recordPrepare
            unit: item.unit,
          },
        })
      }

      results.push({
        materialCode: item.materialCode,
        materialName: item.materialName,
        unit: item.unit,
        neededQty,
        availableQty: totalAvailable,
        lots: plannedLots,
        shortage: remaining > 0 ? remaining : 0,
      })
    }

    return {
      lotNo,
      recipeId: batch.recipeId,
      recipeName: recipe.productName,
      hasShortage: results.some((r) => r.shortage > 0),
      items: results,
    }
  }

  // ── deductIngredients: หักสต็อกจริงตอน recordPrepare ─────────────────────
  // เรียกจาก recordPrepare() ใน transaction เดียวกัน
  private async deductIngredients(
    tx: any,
    batch: Awaited<ReturnType<typeof this.getBatch>>,
    ingredientWeights: Array<{ rmNo: string; actualQty: number }>,
    lotNo: string,
    performedBy: string,
  ) {
    for (const w of ingredientWeights) {
      const ing = batch.ingredients.find((i: any) => i.rmNo === w.rmNo)
      if (!ing) continue

      const stock = await tx.stockLot.findUnique({ where: { rmNo: w.rmNo } })
      if (!stock) throw new NotFoundException(`ไม่พบ StockLot: ${w.rmNo}`)

      const actualQty = w.actualQty
      const leftover  = Number(stock.remainingQty) - actualQty

      if (leftover < 0)
        throw new BadRequestException(
          `RM ${w.rmNo} มีเพียง ${stock.remainingQty} ${stock.unit} แต่ชั่งได้ ${actualQty}`,
        )

      if (leftover > 0) {
        // ชั่งได้น้อยกว่าที่จอง → คืน leftover กลับ lot เดิม, lot นี้ CONSUMED
        await tx.stockLot.update({
          where: { rmNo: w.rmNo },
          data: { remainingQty: leftover },
        })
      } else {
        // ชั่งหมดพอดี → CONSUMED
        await tx.stockLot.update({
          where: { rmNo: w.rmNo },
          data: { remainingQty: 0, status: 'CONSUMED' },
        })
      }

      // StockTransaction: บันทึกการเบิกจริง
      await tx.stockTransaction.create({
        data: {
          rmNo: w.rmNo,
          transactionType: 'RM',
          documentNo: lotNo,
          quantity: actualQty,
          unit: stock.unit,
          fromLocation: stock.location,
          performedBy,
          note: `ชั่งจริง Batch ${lotNo} | แผน: ${Number(ing.plannedQty).toFixed(3)}`,
        },
      })

      // อัปเดต actualQty ใน BatchIngredient
      await tx.batchIngredient.updateMany({
        where: { batchId: batch.id, rmNo: w.rmNo },
        data: { actualQty },
      })
    }
  }
}