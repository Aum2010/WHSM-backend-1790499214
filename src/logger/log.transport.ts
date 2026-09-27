import { Injectable } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import type { WHSMLogEntry } from '../../packages/types'

@Injectable()
export class LogTransport {
  constructor(private readonly prisma: PrismaService) {}

  toCloud(entry: WHSMLogEntry): void {
    process.stdout.write(JSON.stringify(entry) + '\n')
  }

  async toDB(entry: WHSMLogEntry): Promise<void> {
    try {
      await this.prisma.systemLog.create({
        data: {
          level:      entry.level,
          action:     entry.action,
          message:    entry.message,
          requestId:  entry.context.requestId,
          userId:     entry.context.userId,
          userRole:   entry.context.userRole,
          module:     entry.context.module,
          lotNo:      entry.context.lotNo,
          rmNo:       entry.context.rmNo,       // RM stock number
          payload:    entry.payload as any,
          errorInfo:  entry.error as any,
          durationMs: entry.duration_ms,
        },
      })
    } catch {
      process.stderr.write(`[logger] db write failed: ${entry.action}\n`)
    }
  }
}
