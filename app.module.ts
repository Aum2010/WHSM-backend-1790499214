import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { ThrottlerModule } from '@nestjs/throttler'
import { ScheduleModule } from '@nestjs/schedule'

// import { PrismaModule }    from './prisma/prisma.module'
import { PrismaModule }    from './src/prisma/prisma.module'
// import { LoggerModule }    from './logger/logger.module'
import { LoggerModule }    from './src/logger/logger.module'
import { AuthModule }      from './src/modules/auth/auth.module'
import { InventoryModule } from './src/modules/inventory/inventory.module'
import { ProductionModule } from './src/modules/production/production.module'
import { OrderModule }     from './src/modules/order/order.module'
import { QaModule }        from './src/modules/qa/qa.module'
import { PurchaseModule }  from './src/modules/purchase/purchase.module'
import { DashboardModule } from './src/modules/dashboard/dashboard.module'
import { RecipeModule } from './src/modules/recipe/recipe.module'

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 200 }]),
    ScheduleModule.forRoot(),    // สำหรับ cron jobs อนาคต
    PrismaModule,
    LoggerModule,
    AuthModule,
    InventoryModule,
    RecipeModule,
    ProductionModule,
    OrderModule,
    QaModule,
    PurchaseModule,
    DashboardModule,
  ],
})
export class AppModule {}
