import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards } from '@nestjs/common'
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger'
import { SoStatus } from '@prisma/client'
import { JwtGuard }   from '../../common/guards/jwt.guard'
import { RolesGuard } from '../../common/guards/roles.guard'
import { Roles }      from '../../common/decorators/roles.decorator'
import { OrderService }       from './order.service'
import { CreateSoDto }        from './dto/create-so.dto'
import { ConfirmSoDto }       from './dto/confirm-so.dto'
import { UpdateSoStatusDto }  from './dto/update-so-status.dto'

@ApiTags('order')
@ApiBearerAuth()
@UseGuards(JwtGuard, RolesGuard)
@Controller('order')
export class OrderController {
  constructor(private readonly svc: OrderService) {}

  @Get('so')
  @ApiOperation({ summary: 'ดู Sale Orders ทั้งหมด' })
  @ApiQuery({ name: 'status', required: false, enum: SoStatus })
  getSOs(@Query('status') status?: SoStatus) {
    return this.svc.getSOs(status)
  }

  @Get('so/:soNo')
  @ApiOperation({ summary: 'ดูรายละเอียด SO' })
  getSO(@Param('soNo') soNo: string) {
    return this.svc.getSO(soNo)
  }

  @Post('so')
  @Roles('SALES', 'ADMIN')
  @ApiOperation({ summary: 'สร้าง Sale Order ใหม่' })
  createSO(@Body() dto: CreateSoDto) {
    return this.svc.createSO(dto)
  }

  @Patch('so/:soNo/confirm')
  @Roles('WAREHOUSE', 'ADMIN')
  @ApiOperation({ summary: 'WH Confirm SO' })
  confirmSO(@Param('soNo') soNo: string, @Body() dto: ConfirmSoDto) {
    return this.svc.confirmSO(soNo, dto)
  }

  @Patch('so/:soNo/production')
  @Roles('PLANNING', 'ADMIN')
  @ApiOperation({ summary: 'ส่ง MTO order ไปผลิต' })
  sendToProduction(@Param('soNo') soNo: string) {
    return this.svc.sendToProduction(soNo)
  }

  @Patch('so/:soNo/payment')
  @Roles('SALES', 'ACCOUNTING', 'ADMIN')
  @ApiOperation({ summary: 'ยืนยันชำระเงิน' })
  confirmPayment(@Param('soNo') soNo: string) {
    return this.svc.confirmPayment(soNo)
  }

  @Patch('so/:soNo/ship')
  @Roles('WAREHOUSE', 'ADMIN')
  @ApiOperation({ summary: 'จัดส่งสินค้า' })
  shipSO(@Param('soNo') soNo: string) {
    return this.svc.shipSO(soNo)
  }

  @Patch('so/:soNo/status')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'อัปเดต SO status (Admin)' })
  updateStatus(@Param('soNo') soNo: string, @Body() dto: UpdateSoStatusDto) {
    return this.svc.updateStatus(soNo, dto)
  }
}