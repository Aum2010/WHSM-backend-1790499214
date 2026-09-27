import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards } from '@nestjs/common'
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger'
import { LotStatus } from '@prisma/client'
import { JwtGuard }         from '../../common/guards/jwt.guard'
import { RolesGuard }       from '../../common/guards/roles.guard'
import { Roles }            from '../../common/decorators/roles.decorator'
import { InventoryService } from './inventory.service'
import { CreateRoDto }      from './dto/create-ro.dto'
import { CreateRmDto }      from './dto/create-rm.dto'
import { CreateFgtDto }     from './dto/create-fgt.dto'
import { DispatchSoDto }    from './dto/dispatch-so.dto'
import { ReturnWhrmDto }    from './dto/return-whrm.dto'

@ApiTags('inventory')
@ApiBearerAuth()
@UseGuards(JwtGuard, RolesGuard)
@Controller('inventory')
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Get('lots')
  @ApiOperation({ summary: 'ดู stock RM ทั้งหมด' })
  @ApiQuery({ name: 'status', required: false, enum: LotStatus })
  getLots(@Query('status') status?: LotStatus) {
    return this.inventoryService.getLots(status)
  }

  @Get('lots/:rmNo')
  @ApiOperation({ summary: 'ดูรายละเอียด RM' })
  getLot(@Param('rmNo') rmNo: string) {
    return this.inventoryService.getLot(rmNo)
  }

  @Get('transactions')
  @ApiOperation({ summary: 'Transaction Ledger' })
  @ApiQuery({ name: 'rmNo',  required: false })
  @ApiQuery({ name: 'type',  required: false })
  @ApiQuery({ name: 'from',  required: false })
  @ApiQuery({ name: 'to',    required: false })
  @ApiQuery({ name: 'page',  required: false })
  @ApiQuery({ name: 'limit', required: false })
  getTransactions(
    @Query('rmNo')  rmNo?:  string,
    @Query('type')  type?:  string,
    @Query('from')  from?:  string,
    @Query('to')    to?:    string,
    @Query('page')  page?:  number,
    @Query('limit') limit?: number,
  ) {
    return this.inventoryService.getTransactions({ rmNo, type, from, to, page, limit })
  }

  @Post('ro')
  @Roles('WAREHOUSE', 'ADMIN')
  @ApiOperation({ summary: 'รับวัตถุดิบเข้า (RO) — RM Number auto-generate' })
  createRO(@Body() dto: CreateRoDto) {
    return this.inventoryService.createRO(dto)
  }

  @Post('rm')
  @Roles('WAREHOUSE', 'PRODUCTION', 'ADMIN')
  @ApiOperation({ summary: 'เบิกวัตถุดิบ FEFO (RM)' })
  createRM(@Body() dto: CreateRmDto) {
    return this.inventoryService.createRM(dto)
  }

  @Post('fgt')
  @Roles('WAREHOUSE', 'ADMIN')
  @ApiOperation({ summary: 'โอนย้ายสินค้า (FGT)' })
  createFGT(@Body() dto: CreateFgtDto) {
    return this.inventoryService.createFGT(dto)
  }

  @Post('so-dispatch')
  @Roles('WAREHOUSE', 'ADMIN')
  @ApiOperation({ summary: 'ตัดจ่ายสินค้าตาม SO' })
  dispatchSO(@Body() dto: DispatchSoDto) {
    return this.inventoryService.dispatchSO(dto)
  }

  @Post('return-whrm')
  @Roles('PRODUCTION', 'WAREHOUSE', 'ADMIN')
  @ApiOperation({ summary: 'คืนวัตถุดิบส่วนเกินกลับ' })
  returnToWHRM(@Body() dto: ReturnWhrmDto) {
    return this.inventoryService.returnToWHRM(dto)
  }

  @Patch('lots/:rmNo')
  @Roles('WAREHOUSE', 'ADMIN')
  @ApiOperation({ summary: 'แก้ไขข้อมูล RM' })
  updateLot(@Param('rmNo') rmNo: string, @Body() dto: any) {
    return this.inventoryService.updateLot(rmNo, dto)
  }

  @Patch('lots/:rmNo/hold')
  @Roles('QA', 'ADMIN')
  @ApiOperation({ summary: 'กักกัน RM (HOLD)' })
  holdLot(
    @Param('rmNo') rmNo: string,
    @Body() dto: { reason: string; holdBy: string }
  ) {
    return this.inventoryService.holdLot(rmNo, dto.reason, dto.holdBy)
  }

  @Patch('lots/:rmNo/release')
  @Roles('QA')
  @ApiOperation({ summary: 'ปลดล็อค RM — QA เท่านั้น' })
  releaseLot(@Param('rmNo') rmNo: string) {
    return this.inventoryService.releaseLot(rmNo)
  }
}