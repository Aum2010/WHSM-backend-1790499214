import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common'
import { WHSMLogger } from '../../logger/logger.service'

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  constructor(private readonly logger: WHSMLogger) {}
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx    = host.switchToHttp()
    const res    = ctx.getResponse()
    const req    = ctx.getRequest()
    const status = exception instanceof HttpException
      ? exception.getStatus()
      : HttpStatus.INTERNAL_SERVER_ERROR
    this.logger.error(`${req.method} ${req.url}`, exception)
    res.status(status).send({
      success: false,
      message: exception instanceof HttpException
        ? exception.message
        : 'เกิดข้อผิดพลาดภายในระบบ กรุณาติดต่อผู้ดูแล',
      statusCode: status,
    })
  }
}
