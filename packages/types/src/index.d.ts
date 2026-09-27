export type UserRole = 'ADMIN' | 'WAREHOUSE' | 'PRODUCTION' | 'QA' | 'SALES' | 'PLANNING' | 'ACCOUNTING';
export type WHSMModule = 'INVENTORY' | 'PRODUCTION' | 'ORDER' | 'QA' | 'DASHBOARD' | 'PURCHASE';
export type LogLevel = 'USER_ACTION' | 'BUSINESS' | 'API' | 'ERROR' | 'DEBUG';
export interface LogContext {
    requestId: string;
    userId?: string;
    userRole?: UserRole;
    module: WHSMModule;
    lotNo?: string;
    batchNo?: string;
}
export interface WHSMLogEntry {
    timestamp: string;
    level: LogLevel;
    action: string;
    message: string;
    context: LogContext;
    payload?: Record<string, unknown>;
    duration_ms?: number;
    error?: {
        name: string;
        message: string;
        stack?: string;
    };
}
export type LotStatus = 'AVAILABLE' | 'HOLD' | 'REWORK' | 'CONSUMED' | 'EXPIRED';
export type DocumentType = 'RO' | 'RM' | 'FGT' | 'SO' | 'PO' | 'INVOICE' | 'PACKING_LIST';
export interface ApiResponse<T = unknown> {
    success: boolean;
    data?: T;
    message?: string;
    requestId?: string;
}
export interface PaginatedResponse<T> {
    data: T[];
    total: number;
    page: number;
    limit: number;
}
