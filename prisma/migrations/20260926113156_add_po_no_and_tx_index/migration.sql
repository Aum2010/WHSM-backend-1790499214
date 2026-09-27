-- AlterTable
ALTER TABLE "stock_lots" ADD COLUMN     "po_no" TEXT;

-- CreateIndex
CREATE INDEX "stock_lots_po_no_idx" ON "stock_lots"("po_no");

-- CreateIndex
CREATE INDEX "stock_transactions_created_at_idx" ON "stock_transactions"("created_at" DESC);
