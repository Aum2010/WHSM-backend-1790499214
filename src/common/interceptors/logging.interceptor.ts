import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common'
import { Observable } from 'rxjs'
import { tap } from 'rxjs/operators'
import { WHSMLogger, logStorage } from '../../logger/logger.service'

function detectModule(url: string) {
  if (url.includes('/inventory'))  return 'INVENTORY'  as const
  if (url.includes('/production')) return 'PRODUCTION' as const
  if (url.includes('/order'))      return 'ORDER'      as const
  if (url.includes('/qa'))         return 'QA'         as const
  if (url.includes('/purchase'))   return 'PURCHASE'   as const
  return 'DASHBOARD' as const
}

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  constructor(private readonly logger: WHSMLogger) {}
  intercept(ctx: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req   = ctx.switchToHttp().getRequest()
    const start = Date.now()
    const context = WHSMLogger.createContext({
      userId:   req.headers['x-user-id'],
      userRole: req.headers['x-user-role'],
      module:   detectModule(req.url),
    })
    return new Observable(sub => {
      logStorage.run(context, () => {
        next.handle().pipe(
          tap({
            next:  () => this.logger.api(`${req.method} ${req.url}`, Date.now() - start),
            error: (err) => this.logger.error(`${req.method} ${req.url}`, err),
          })
        ).subscribe(sub)
      })
    })
  }
}
