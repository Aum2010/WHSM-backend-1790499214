import { Controller, Get, Post, Patch, Param, Body, Query, UseGuards } from '@nestjs/common'
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger'
import { ProductionService } from './production.service'
import { CreateBatchDto } from './dto/create-batch.dto'
import { RecordStageDto } from './dto/record-stage.dto'
import { AddIngredientDto } from './dto/add-ingredient.dto'
import { JwtAuthGuard } from '../auth/jwt-auth.guard'

@ApiTags('Production')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('api/v1/production')
export class ProductionController {
  constructor(private svc: ProductionService) {}

  @Get('batches')
  @ApiOperation({ summary: 'List batches' })
  list(@Query('status') status?: string) {
    return this.svc.listBatches(status)
  }

  @Post('batches')
  @ApiOperation({ summary: 'Create batch (auto-gen lotNo)' })
  create(@Body() dto: CreateBatchDto) {
    return this.svc.createBatch(dto)
  }

  @Get('batches/:lotNo')
  @ApiOperation({ summary: 'Get batch detail' })
  get(@Param('lotNo') lotNo: string) {
    return this.svc.getBatch(lotNo)
  }

  @Post('batches/:lotNo/ingredients')
  @ApiOperation({ summary: 'Add ingredient (deduct rmNo stock)' })
  addIngredient(@Param('lotNo') lotNo: string, @Body() dto: AddIngredientDto) {
    return this.svc.addIngredient(lotNo, dto)
  }

  @Patch('batches/:lotNo/prepare')
  @ApiOperation({ summary: 'Record Stage 1: Prepare' })
  prepare(@Param('lotNo') lotNo: string, @Body() dto: RecordStageDto) {
    return this.svc.recordPrepare(lotNo, dto)
  }

  @Patch('batches/:lotNo/mix')
  @ApiOperation({ summary: 'Record Stage 2: Mix/Marinate' })
  mix(@Param('lotNo') lotNo: string, @Body() dto: RecordStageDto) {
    return this.svc.recordMix(lotNo, dto)
  }

  @Patch('batches/:lotNo/skewer')
  @ApiOperation({ summary: 'Record Stage 3: Skewer' })
  skewer(@Param('lotNo') lotNo: string, @Body() dto: RecordStageDto) {
    return this.svc.recordSkewer(lotNo, dto)
  }

  @Patch('batches/:lotNo/pack')
  @ApiOperation({ summary: 'Record Stage 4: Pack' })
  pack(@Param('lotNo') lotNo: string, @Body() dto: RecordStageDto) {
    return this.svc.recordPack(lotNo, dto)
  }

  @Patch('batches/:lotNo/cancel')
  @ApiOperation({ summary: 'Cancel batch (return RM stock)' })
  cancel(@Param('lotNo') lotNo: string, @Body('performedBy') performedBy: string) {
    return this.svc.cancelBatch(lotNo, performedBy)
  }
}