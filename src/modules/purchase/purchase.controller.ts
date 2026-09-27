import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards } from '@nestjs/common'
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger'
import { PoStatus } from '@prisma/client'
import { JwtGuard }   from '../../common/guards/jwt.guard'
import { RolesGuard } from '../../common/guards/roles.guard'
import { Roles }      from '../../common/decorators/roles.decorator'
import { PurchaseService }   from './purchase.service'
import { CreatePoDto }       from './dto/create-po.dto'
import { UpdatePoStatusDto } from './dto/update-po-status.dto'

@ApiTags('purchase')
@ApiBearerAuth()
@UseGuards(JwtGuard, RolesGuard)
@Controller('purchase')
export class PurchaseController {
  constructor(private readonly svc: PurchaseService) {}

  @Get('po')
  @ApiOperation({ summary: 'ดู Purchase Orders ทั้งหมด' })
  @ApiQuery({ name: 'status', required: false, enum: PoStatus })
  getPOs(@Query('status') status?: PoStatus) {
    return this.svc.getPOs(status)
  }

  @Get('po/:poNo')
  @ApiOperation({ summary: 'ดูรายละเอียด PO' })
  getPO(@Param('poNo') poNo: string) {
    return this.svc.getPO(poNo)
  }

  @Post('po')
  @Roles('PLANNING', 'ADMIN')
  @ApiOperation({ summary: 'สร้าง Purchase Order ใหม่' })
  createPO(@Body() dto: CreatePoDto) {
    return this.svc.createPO(dto)
  }

  @Patch('po/:poNo/approve')
  @Roles('ADMIN', 'ACCOUNTING')
  @ApiOperation({ summary: 'Approve PO' })
  approvePO(@Param('poNo') poNo: string) {
    return this.svc.approvePO(poNo)
  }

  @Patch('po/:poNo/shipped')
  @Roles('PLANNING', 'WAREHOUSE', 'ADMIN')
  @ApiOperation({ summary: 'Supplier ส่งของแล้ว' })
  markShipped(@Param('poNo') poNo: string) {
    return this.svc.markShipped(poNo)
  }

  @Patch('po/:poNo/received')
  @Roles('WAREHOUSE', 'ADMIN')
  @ApiOperation({ summary: 'รับของเข้าแล้ว (ต่อด้วย RO)' })
  markReceived(@Param('poNo') poNo: string) {
    return this.svc.markReceived(poNo)
  }

  @Patch('po/:poNo/cancel')
  @Roles('PLANNING', 'ADMIN')
  @ApiOperation({ summary: 'ยกเลิก PO' })
  cancelPO(@Param('poNo') poNo: string) {
    return this.svc.cancelPO(poNo)
  }
}