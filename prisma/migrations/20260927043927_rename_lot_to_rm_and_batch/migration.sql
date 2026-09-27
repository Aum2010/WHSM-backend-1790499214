/*
  Warnings:

  - You are about to drop the column `lot_no` on the `batch_ingredients` table. All the data in the column will be lost.
  - You are about to drop the column `batch_no` on the `batches` table. All the data in the column will be lost.
  - You are about to drop the column `lot_no` on the `deviation_reports` table. All the data in the column will be lost.
  - You are about to drop the column `lot_no` on the `so_items` table. All the data in the column will be lost.
  - You are about to drop the column `lot_no` on the `stock_lots` table. All the data in the column will be lost.
  - You are about to drop the column `lot_no` on the `stock_transactions` table. All the data in the column will be lost.
  - You are about to drop the column `batch_no` on the `system_logs` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[lot_no]` on the table `batches` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[rm_no]` on the table `stock_lots` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `rm_no` to the `batch_ingredients` table without a default value. This is not possible if the table is not empty.
  - Added the required column `lot_no` to the `batches` table without a default value. This is not possible if the table is not empty.
  - Added the required column `rm_no` to the `deviation_reports` table without a default value. This is not possible if the table is not empty.
  - Added the required column `rm_no` to the `stock_lots` table without a default value. This is not possible if the table is not empty.
  - Added the required column `rm_no` to the `stock_transactions` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "batch_ingredients" DROP CONSTRAINT "batch_ingredients_lot_no_fkey";

-- DropForeignKey
ALTER TABLE "stock_transactions" DROP CONSTRAINT "stock_transactions_lot_no_fkey";

-- DropIndex
DROP INDEX "batches_batch_no_key";

-- DropIndex
DROP INDEX "deviation_reports_lot_no_idx";

-- DropIndex
DROP INDEX "stock_lots_lot_no_idx";

-- DropIndex
DROP INDEX "stock_lots_lot_no_key";

-- DropIndex
DROP INDEX "stock_transactions_lot_no_idx";

-- AlterTable
ALTER TABLE "batch_ingredients" DROP COLUMN "lot_no",
ADD COLUMN     "rm_no" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "batches" DROP COLUMN "batch_no",
ADD COLUMN     "lot_no" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "deviation_reports" DROP COLUMN "lot_no",
ADD COLUMN     "rm_no" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "so_items" DROP COLUMN "lot_no",
ADD COLUMN     "rm_no" TEXT;

-- AlterTable
ALTER TABLE "stock_lots" DROP COLUMN "lot_no",
ADD COLUMN     "rm_no" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "stock_transactions" DROP COLUMN "lot_no",
ADD COLUMN     "rm_no" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "system_logs" DROP COLUMN "batch_no",
ADD COLUMN     "rm_no" VARCHAR(100);

-- CreateIndex
CREATE UNIQUE INDEX "batches_lot_no_key" ON "batches"("lot_no");

-- CreateIndex
CREATE INDEX "batches_lot_no_idx" ON "batches"("lot_no");

-- CreateIndex
CREATE INDEX "batches_status_idx" ON "batches"("status");

-- CreateIndex
CREATE INDEX "deviation_reports_rm_no_idx" ON "deviation_reports"("rm_no");

-- CreateIndex
CREATE UNIQUE INDEX "stock_lots_rm_no_key" ON "stock_lots"("rm_no");

-- CreateIndex
CREATE INDEX "stock_lots_rm_no_idx" ON "stock_lots"("rm_no");

-- CreateIndex
CREATE INDEX "stock_lots_material_code_idx" ON "stock_lots"("material_code");

-- CreateIndex
CREATE INDEX "stock_transactions_rm_no_idx" ON "stock_transactions"("rm_no");

-- CreateIndex
CREATE INDEX "system_logs_rm_no_idx" ON "system_logs"("rm_no");

-- AddForeignKey
ALTER TABLE "stock_transactions" ADD CONSTRAINT "stock_transactions_rm_no_fkey" FOREIGN KEY ("rm_no") REFERENCES "stock_lots"("rm_no") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "batch_ingredients" ADD CONSTRAINT "batch_ingredients_rm_no_fkey" FOREIGN KEY ("rm_no") REFERENCES "stock_lots"("rm_no") ON DELETE RESTRICT ON UPDATE CASCADE;
