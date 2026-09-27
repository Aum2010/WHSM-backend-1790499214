-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'WAREHOUSE', 'PRODUCTION', 'QA', 'SALES', 'PLANNING', 'ACCOUNTING');

-- CreateEnum
CREATE TYPE "LotStatus" AS ENUM ('AVAILABLE', 'HOLD', 'REWORK', 'CONSUMED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "TxType" AS ENUM ('RO', 'RM', 'FGT', 'SO_DISPATCH', 'RETURN_WHRM', 'REWORK');

-- CreateEnum
CREATE TYPE "BatchStatus" AS ENUM ('PREPARING', 'MIXING', 'SKEWERING', 'PACKING', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "Stage" AS ENUM ('PREPARE', 'MIX', 'SKEWER', 'PACK');

-- CreateEnum
CREATE TYPE "BlastMode" AS ENUM ('BLAST', 'NON_BLAST');

-- CreateEnum
CREATE TYPE "OrderType" AS ENUM ('GENERAL', 'MTO', 'MTS');

-- CreateEnum
CREATE TYPE "SoStatus" AS ENUM ('PENDING', 'CONFIRMED', 'IN_PRODUCTION', 'READY', 'PAID', 'SHIPPED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PoStatus" AS ENUM ('PENDING', 'APPROVED', 'SHIPPED', 'RECEIVED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "DeviationStatus" AS ENUM ('OPEN', 'APPROVED_REWORK', 'APPROVED_MOVE', 'CLOSED');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "card_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "UserRole" NOT NULL,
    "password_hash" TEXT NOT NULL,
    "department" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock_lots" (
    "id" TEXT NOT NULL,
    "lot_no" TEXT NOT NULL,
    "material_code" TEXT NOT NULL,
    "material_name" TEXT NOT NULL,
    "quantity" DECIMAL(12,3) NOT NULL,
    "remaining_qty" DECIMAL(12,3) NOT NULL,
    "unit" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "status" "LotStatus" NOT NULL DEFAULT 'AVAILABLE',
    "supplier_code" TEXT,
    "expiry_date" TIMESTAMP(3),
    "received_by" TEXT,
    "hold_reason" TEXT,
    "hold_by" TEXT,
    "hold_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "stock_lots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock_transactions" (
    "id" TEXT NOT NULL,
    "lot_no" TEXT NOT NULL,
    "transaction_type" "TxType" NOT NULL,
    "document_no" TEXT NOT NULL,
    "quantity" DECIMAL(12,3) NOT NULL,
    "unit" TEXT NOT NULL,
    "from_location" TEXT,
    "to_location" TEXT,
    "performed_by" TEXT NOT NULL,
    "note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stock_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "batches" (
    "id" TEXT NOT NULL,
    "batch_no" TEXT NOT NULL,
    "product_code" TEXT NOT NULL,
    "product_name" TEXT NOT NULL,
    "recipe_id" TEXT,
    "status" "BatchStatus" NOT NULL DEFAULT 'PREPARING',
    "started_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "started_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "batches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "batch_ingredients" (
    "id" TEXT NOT NULL,
    "batch_id" TEXT NOT NULL,
    "lot_no" TEXT NOT NULL,
    "planned_qty" DECIMAL(12,3) NOT NULL,
    "actual_qty" DECIMAL(12,3) NOT NULL,
    "unit" TEXT NOT NULL,

    CONSTRAINT "batch_ingredients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "batch_records" (
    "id" TEXT NOT NULL,
    "batch_id" TEXT NOT NULL,
    "stage" "Stage" NOT NULL,
    "good_qty" DECIMAL(12,3) NOT NULL,
    "waste_qty" DECIMAL(12,3) NOT NULL,
    "unit" TEXT NOT NULL,
    "blast_mode" "BlastMode",
    "start_time" TIMESTAMP(3),
    "end_time" TIMESTAMP(3),
    "performed_by" TEXT NOT NULL,
    "note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "batch_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "so_documents" (
    "id" TEXT NOT NULL,
    "so_no" TEXT NOT NULL,
    "order_type" "OrderType" NOT NULL,
    "status" "SoStatus" NOT NULL DEFAULT 'PENDING',
    "customer_id" TEXT,
    "created_by" TEXT NOT NULL,
    "confirmed_by" TEXT,
    "confirmed_at" TIMESTAMP(3),
    "paid_at" TIMESTAMP(3),
    "shipped_at" TIMESTAMP(3),
    "note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "so_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "so_items" (
    "id" TEXT NOT NULL,
    "so_id" TEXT NOT NULL,
    "material_code" TEXT NOT NULL,
    "material_name" TEXT NOT NULL,
    "quantity" DECIMAL(12,3) NOT NULL,
    "unit" TEXT NOT NULL,
    "lot_no" TEXT,

    CONSTRAINT "so_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "po_documents" (
    "id" TEXT NOT NULL,
    "po_no" TEXT NOT NULL,
    "supplier_code" TEXT NOT NULL,
    "supplier_name" TEXT NOT NULL,
    "status" "PoStatus" NOT NULL DEFAULT 'PENDING',
    "created_by" TEXT NOT NULL,
    "expected_date" TIMESTAMP(3),
    "received_at" TIMESTAMP(3),
    "note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "po_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "po_items" (
    "id" TEXT NOT NULL,
    "po_id" TEXT NOT NULL,
    "material_code" TEXT NOT NULL,
    "material_name" TEXT NOT NULL,
    "quantity" DECIMAL(12,3) NOT NULL,
    "unit" TEXT NOT NULL,

    CONSTRAINT "po_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "deviation_reports" (
    "id" TEXT NOT NULL,
    "report_no" TEXT NOT NULL,
    "lot_no" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "status" "DeviationStatus" NOT NULL DEFAULT 'OPEN',
    "reported_by" TEXT NOT NULL,
    "resolved_by" TEXT,
    "resolved_at" TIMESTAMP(3),
    "resolution" TEXT,
    "rework_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "deviation_reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "system_hold" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "is_active" BOOLEAN NOT NULL DEFAULT false,
    "reason" TEXT,
    "activated_by" TEXT,
    "activated_at" TIMESTAMP(3),
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "system_hold_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "system_logs" (
    "id" BIGSERIAL NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "level" VARCHAR(20) NOT NULL,
    "action" VARCHAR(100) NOT NULL,
    "message" TEXT,
    "request_id" UUID,
    "user_id" TEXT,
    "user_role" VARCHAR(50),
    "module" VARCHAR(50),
    "lot_no" VARCHAR(100),
    "batch_no" VARCHAR(100),
    "payload" JSONB,
    "error_info" JSONB,
    "duration_ms" INTEGER,

    CONSTRAINT "system_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_card_id_key" ON "users"("card_id");

-- CreateIndex
CREATE UNIQUE INDEX "stock_lots_lot_no_key" ON "stock_lots"("lot_no");

-- CreateIndex
CREATE INDEX "stock_lots_lot_no_idx" ON "stock_lots"("lot_no");

-- CreateIndex
CREATE INDEX "stock_lots_status_idx" ON "stock_lots"("status");

-- CreateIndex
CREATE INDEX "stock_lots_expiry_date_idx" ON "stock_lots"("expiry_date");

-- CreateIndex
CREATE INDEX "stock_transactions_lot_no_idx" ON "stock_transactions"("lot_no");

-- CreateIndex
CREATE INDEX "stock_transactions_transaction_type_idx" ON "stock_transactions"("transaction_type");

-- CreateIndex
CREATE UNIQUE INDEX "batches_batch_no_key" ON "batches"("batch_no");

-- CreateIndex
CREATE INDEX "batch_records_batch_id_stage_idx" ON "batch_records"("batch_id", "stage");

-- CreateIndex
CREATE UNIQUE INDEX "so_documents_so_no_key" ON "so_documents"("so_no");

-- CreateIndex
CREATE UNIQUE INDEX "po_documents_po_no_key" ON "po_documents"("po_no");

-- CreateIndex
CREATE UNIQUE INDEX "deviation_reports_report_no_key" ON "deviation_reports"("report_no");

-- CreateIndex
CREATE INDEX "deviation_reports_lot_no_idx" ON "deviation_reports"("lot_no");

-- CreateIndex
CREATE INDEX "system_logs_timestamp_idx" ON "system_logs"("timestamp" DESC);

-- CreateIndex
CREATE INDEX "system_logs_lot_no_idx" ON "system_logs"("lot_no");

-- CreateIndex
CREATE INDEX "system_logs_user_id_idx" ON "system_logs"("user_id");

-- CreateIndex
CREATE INDEX "system_logs_level_idx" ON "system_logs"("level");

-- AddForeignKey
ALTER TABLE "stock_transactions" ADD CONSTRAINT "stock_transactions_lot_no_fkey" FOREIGN KEY ("lot_no") REFERENCES "stock_lots"("lot_no") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_transactions" ADD CONSTRAINT "stock_transactions_performed_by_fkey" FOREIGN KEY ("performed_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "batch_ingredients" ADD CONSTRAINT "batch_ingredients_batch_id_fkey" FOREIGN KEY ("batch_id") REFERENCES "batches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "batch_ingredients" ADD CONSTRAINT "batch_ingredients_lot_no_fkey" FOREIGN KEY ("lot_no") REFERENCES "stock_lots"("lot_no") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "batch_records" ADD CONSTRAINT "batch_records_batch_id_fkey" FOREIGN KEY ("batch_id") REFERENCES "batches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "batch_records" ADD CONSTRAINT "batch_records_performed_by_fkey" FOREIGN KEY ("performed_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "so_documents" ADD CONSTRAINT "so_documents_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "so_items" ADD CONSTRAINT "so_items_so_id_fkey" FOREIGN KEY ("so_id") REFERENCES "so_documents"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "po_documents" ADD CONSTRAINT "po_documents_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "po_items" ADD CONSTRAINT "po_items_po_id_fkey" FOREIGN KEY ("po_id") REFERENCES "po_documents"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deviation_reports" ADD CONSTRAINT "deviation_reports_reported_by_fkey" FOREIGN KEY ("reported_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "system_logs" ADD CONSTRAINT "system_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
