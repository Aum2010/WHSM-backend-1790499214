import { Module, Global } from '@nestjs/common'
import { WHSMLogger }   from './logger.service'
import { LogTransport } from './log.transport'

@Global()
@Module({
  providers: [WHSMLogger, LogTransport],
  exports: [WHSMLogger],
})
export class LoggerModule {}
