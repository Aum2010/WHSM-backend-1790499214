import { Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService }   from '../../prisma/prisma.service'
import { WHSMLogger }      from '../../logger/logger.service'
import { CreateRecipeDto } from './dto/create-recipe.dto'

@Injectable()
export class RecipeService {
  constructor(
    private prisma: PrismaService,
    private logger: WHSMLogger,
  ) {}

  // ── GET all recipes ───────────────────────────────
  getRecipes() {
    return this.prisma.recipe.findMany({
      where:   { isActive: true },
      include: { items: true },
      orderBy: { productName: 'asc' },
    })
  }

  async getRecipe(productCode: string) {
    const recipe = await this.prisma.recipe.findUnique({
      where:   { productCode },
      include: { items: true },
    })
    if (!recipe) throw new NotFoundException(`ไม่พบสูตร: ${productCode}`)
    return recipe
  }

  // ── สร้าง Recipe ──────────────────────────────────
  async createRecipe(dto: CreateRecipeDto) {
    this.logger.business('CREATE_RECIPE', `Recipe: ${dto.productCode}`, { ...dto })
    return this.prisma.recipe.create({
      data: {
        productCode: dto.productCode,
        productName: dto.productName,
        description: dto.description,
        yieldQty:    dto.yieldQty.toString(),
        yieldUnit:   dto.yieldUnit,
        items: {
          create: dto.items.map(i => ({
            materialCode: i.materialCode,
            materialName: i.materialName,
            quantity:     i.quantity.toString(),
            unit:         i.unit,
            note:         i.note,
          })),
        },
      },
      include: { items: true },
    })
  }

  // ── แก้ไข Recipe ──────────────────────────────────
  async updateRecipe(productCode: string, dto: CreateRecipeDto) {
    const recipe = await this.getRecipe(productCode)
    this.logger.business('UPDATE_RECIPE', `Recipe updated: ${productCode}`, { ...dto })

    return this.prisma.$transaction(async tx => {
      // ลบ items เก่าก่อน
      await tx.recipeItem.deleteMany({ where: { recipeId: recipe.id } })
      // สร้างใหม่
      return tx.recipe.update({
        where: { productCode },
        data: {
          productName: dto.productName,
          description: dto.description,
          yieldQty:    dto.yieldQty.toString(),
          yieldUnit:   dto.yieldUnit,
          items: {
            create: dto.items.map(i => ({
              materialCode: i.materialCode,
              materialName: i.materialName,
              quantity:     i.quantity.toString(),
              unit:         i.unit,
              note:         i.note,
            })),
          },
        },
        include: { items: true },
      })
    })
  }

  // ── ตรวจสอบ stock พอไหม ──────────────────────────
  async checkStock(productCode: string, multiplier = 1) {
    const recipe = await this.getRecipe(productCode)

    const checks = await Promise.all(
      recipe.items.map(async item => {
        const required = Number(item.quantity) * multiplier
        // รวม stock ทั้งหมดของ materialCode นี้
        const lots = await this.prisma.stockLot.findMany({
          where: {
            materialCode: item.materialCode,
            status: 'AVAILABLE',
          },
        })
        const totalStock = lots.reduce((sum, l) => sum + Number(l.remainingQty), 0)

        return {
          materialCode: item.materialCode,
          materialName: item.materialName,
          required,
          unit:         item.unit,
          inStock:      totalStock,
          sufficient:   totalStock >= required,
          shortage:     Math.max(0, required - totalStock),
          lots:         lots.map(l => ({
            rmNo:         l.rmNo, 
            remainingQty: Number(l.remainingQty),
            location:     l.location,
            expiryDate:   l.expiryDate,
          })),
        }
      })
    )

    return {
      productCode,
      productName:    recipe.productName,
      multiplier,
      yieldQty:       Number(recipe.yieldQty) * multiplier,
      yieldUnit:      recipe.yieldUnit,
      allSufficient:  checks.every(c => c.sufficient),
      items:          checks,
    }
  }
}