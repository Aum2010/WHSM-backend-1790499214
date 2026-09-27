import { Controller, Get, Post, Put, Body, Param, Query, UseGuards } from '@nestjs/common'
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger'
import { JwtGuard }       from '../../common/guards/jwt.guard'
import { RolesGuard }     from '../../common/guards/roles.guard'
import { Roles }          from '../../common/decorators/roles.decorator'
import { RecipeService }  from './recipe.service'
import { CreateRecipeDto } from './dto/create-recipe.dto'

@ApiTags('recipe')
@ApiBearerAuth()
@UseGuards(JwtGuard, RolesGuard)
@Controller('recipe')
export class RecipeController {
  constructor(private readonly svc: RecipeService) {}

  @Get()
  @ApiOperation({ summary: 'ดูสูตรทั้งหมด' })
  getRecipes() { return this.svc.getRecipes() }

  @Get(':productCode')
  @ApiOperation({ summary: 'ดูสูตรตาม productCode' })
  getRecipe(@Param('productCode') code: string) {
    return this.svc.getRecipe(code)
  }

  @Get(':productCode/check-stock')
  @ApiOperation({ summary: 'เช็ค stock พอสำหรับผลิตไหม' })
  @ApiQuery({ name: 'multiplier', required: false, description: 'จำนวน batch' })
  checkStock(
    @Param('productCode') code: string,
    @Query('multiplier') multiplier?: number,
  ) {
    return this.svc.checkStock(code, multiplier ? Number(multiplier) : 1)
  }

  @Post()
  @Roles('ADMIN', 'PLANNING')
  @ApiOperation({ summary: 'สร้างสูตรใหม่' })
  createRecipe(@Body() dto: CreateRecipeDto) {
    return this.svc.createRecipe(dto)
  }

  @Put(':productCode')
  @Roles('ADMIN', 'PLANNING')
  @ApiOperation({ summary: 'แก้ไขสูตร' })
  updateRecipe(
    @Param('productCode') code: string,
    @Body() dto: CreateRecipeDto,
  ) {
    return this.svc.updateRecipe(code, dto)
  }
}