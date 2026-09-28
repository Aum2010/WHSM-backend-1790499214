import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common'
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger'
import { DashboardService } from './dashboard.service'
// import { JwtAuthGuard } from '../auth/jwt-auth.guard'
import { JwtAuthGuard } from '../auth/jwt-auth.guard'

@ApiTags('Dashboard')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('dashboard')
export class DashboardController {
  constructor(private svc: DashboardService) {}

  @Get('kpi')
  @ApiOperation({ summary: 'KPI snapshot' })
  kpi() {
    return this.svc.getKpi()
  }

  @Get('transactions')
  @ApiOperation({ summary: 'Recent stock transactions' })
  transactions(@Query('limit') limit?: string) {
    return this.svc.getRecentTransactions(limit ? parseInt(limit) : 20)
  }

  @Get('stock')
  @ApiOperation({ summary: 'Stock summary (non-EXPIRED)' })
  stock() {
    return this.svc.getStockSummary()
  }

  @Get('production')
  @ApiOperation({ summary: 'Active batches summary' })
  production() {
    return this.svc.getProductionSummary()
  }

  @Get('trace/:rmNo')
  @ApiOperation({ summary: 'Trace RM lot history + batch usage' })
  trace(@Param('rmNo') rmNo: string) {
    return this.svc.getTrace(rmNo)
  }
}