import { Controller, Get, Post, Patch, Body, Param, UseGuards } from '@nestjs/common'
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger'
import { JwtGuard }            from '../../common/guards/jwt.guard'
import { RolesGuard }          from '../../common/guards/roles.guard'
import { Roles }               from '../../common/decorators/roles.decorator'
import { QaService }           from './qa.service'
import { CreateDeviationDto }  from './dto/create-deviation.dto'
import { ResolveDeviationDto } from './dto/resolve-deviation.dto'
import { SystemHoldDto }       from './dto/system-hold.dto'

@ApiTags('qa')
@ApiBearerAuth()
@UseGuards(JwtGuard, RolesGuard)
@Controller('qa')
export class QaController {
  constructor(private readonly svc: QaService) {}

  @Get('deviations')
  @ApiOperation({ summary: 'ดู Deviation reports ทั้งหมด' })
  getDeviations() { return this.svc.getDeviations() }

  @Get('deviations/:reportNo')
  @ApiOperation({ summary: 'ดูรายละเอียด Deviation' })
  getDeviation(@Param('reportNo') reportNo: string) {
    return this.svc.getDeviation(reportNo)
  }

  @Post('deviation')
  @Roles('QA', 'ADMIN')
  @ApiOperation({ summary: 'ออก Deviation Report + Lock RM ทันที' })
  createDeviation(@Body() dto: CreateDeviationDto) {
    return this.svc.createDeviationAndHold(dto)
  }

  @Patch('lots/:rmNo/release')
  @Roles('QA')
  @ApiOperation({ summary: 'ปลดล็อค RM — QA เท่านั้น' })
  releaseLot(@Param('rmNo') rmNo: string, @Body() dto: ResolveDeviationDto) {
    return this.svc.releaseLot(rmNo, dto)
  }

  @Patch('lots/:rmNo/rework')
  @Roles('QA')
  @ApiOperation({ summary: 'อนุมัติ Rework — QA เท่านั้น' })
  approveRework(@Param('rmNo') rmNo: string, @Body() dto: ResolveDeviationDto) {
    return this.svc.approveRework(rmNo, dto)
  }

  @Patch('system-hold')
  @Roles('QA', 'ADMIN')
  @ApiOperation({ summary: 'System-wide HOLD (Emergency)' })
  toggleSystemHold(@Body() dto: SystemHoldDto) {
    return this.svc.toggleSystemHold(dto)
  }

  @Get('system-hold')
  @ApiOperation({ summary: 'ดูสถานะ System HOLD' })
  getSystemHoldStatus() { return this.svc.getSystemHoldStatus() }
}