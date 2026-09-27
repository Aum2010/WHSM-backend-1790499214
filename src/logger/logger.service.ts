import { Injectable } from '@nestjs/common'
import { AsyncLocalStorage } from 'async_hooks'
import { randomUUID } from 'crypto'
import { LogTransport } from './log.transport'
import type { LogLevel, WHSMLogEntry, LogContext } from '../../packages/types'

export const logStorage = new AsyncLocalStorage<LogContext>()

@Injectable()
export class WHSMLogger {
  constructor(private readonly transport: LogTransport) {}

  static createContext(partial: Partial<LogContext>): LogContext {
    return { requestId: randomUUID(), module: 'INVENTORY', ...partial }
  }

  static getContext(): LogContext | undefined {
    return logStorage.getStore()
  }

  private emit(level: LogLevel, action: string, message: string,
               extra: Partial<WHSMLogEntry> = {}): void {
    const entry: WHSMLogEntry = {
      timestamp: new Date().toISOString(), level, action, message,
      context: logStorage.getStore() ?? { requestId: 'no-ctx', module: 'INVENTORY' },
      ...extra,
    }
    this.transport.toCloud(entry)
    this.transport.toDB(entry).catch(() => {})
  }

  userAction(action: string, payload?: Record<string, unknown>) {
    this.emit('USER_ACTION', action, `User: ${action}`, { payload })
  }
  business(action: string, message: string, payload?: Record<string, unknown>) {
    this.emit('BUSINESS', action, message, { payload })
  }
  api(action: string, duration_ms: number, payload?: Record<string, unknown>) {
    this.emit('API', action, `${action} ${duration_ms}ms`, { duration_ms, payload })
  }
  error(action: string, err: unknown, payload?: Record<string, unknown>) {
    const e = err instanceof Error ? err : new Error(String(err))
    this.emit('ERROR', action, e.message, {
      payload, error: { name: e.name, message: e.message, stack: e.stack },
    })
  }
  debug(message: string, payload?: Record<string, unknown>) {
    if (process.env.NODE_ENV === 'production') return
    this.emit('DEBUG', 'DEBUG', message, { payload })
  }
}
