// apps/api-fresh/src/main.ts
import { NestFactory } from '@nestjs/core'
import { ValidationPipe, Logger } from '@nestjs/common'
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger'
import { AppModule } from './app.module'

async function bootstrap() {
  const logger = new Logger('Bootstrap')
  const app = await NestFactory.create(AppModule)   // ← Express (default)

  app.setGlobalPrefix('api/v1')

  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    transform: true,
  }))

  app.enableCors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true,
  })

  if (process.env.NODE_ENV !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('WHSM API')
      .setDescription('Food Factory ERP/MES/WMS API')
      .setVersion('1.0')
      .addBearerAuth()
      .build()
    const doc = SwaggerModule.createDocument(app, config)
    SwaggerModule.setup('api/docs', app, doc)
    logger.log('Swagger: http://localhost:3000/api/docs')
  }

  const port = process.env.PORT || 3000
  await app.listen(port)
  logger.log(`API running on port ${port}`)
}

bootstrap()