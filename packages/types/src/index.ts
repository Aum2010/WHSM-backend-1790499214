// ─── Roles ───────────────────────────────────────────────
export type UserRole =
  | 'ADMIN'
  | 'WAREHOUSE'
  | 'PRODUCTION'
  | 'QA'
  | 'SALES'
  | 'PLANNING'
  | 'ACCOUNTING'

// ─── Modules ─────────────────────────────────────────────
export type WHSMModule =
  | 'INVENTORY'
  | 'PRODUCTION'
  | 'ORDER'
  | 'QA'
  | 'DASHBOARD'
  | 'PURCHASE'

// ─── Log levels ──────────────────────────────────────────
export type LogLevel = 'USER_ACTION' | 'BUSINESS' | 'API' | 'ERROR' | 'DEBUG'

export interface LogContext {
  requestId: string
  userId?: string
  userRole?: UserRole
  module: WHSMModule
  lotNo?: string    // Batch lot number (LOT-YYYYMMDD-XXXX)
  rmNo?: string     // RM stock number (RM-YYYYMMDD-XXXX)
}

export interface WHSMLogEntry {
  timestamp: string
  level: LogLevel
  action: string
  message: string
  context: LogContext
  payload?: Record<string, unknown>
  duration_ms?: number
  error?: { name: string; message: string; stack?: string }
}

// ─── Lot status ──────────────────────────────────────────
export type LotStatus = 'AVAILABLE' | 'HOLD' | 'REWORK' | 'CONSUMED' | 'EXPIRED'

// ─── Document types ──────────────────────────────────────
export type DocumentType = 'RO' | 'RM' | 'FGT' | 'SO' | 'PO' | 'INVOICE' | 'PACKING_LIST'

// ─── API response wrapper ─────────────────────────────────
export interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  message?: string
  requestId?: string
}

// ─── Pagination ───────────────────────────────────────────
export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  limit: number
}
