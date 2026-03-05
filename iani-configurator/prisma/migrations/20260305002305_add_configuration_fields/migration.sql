/*
  Warnings:

  - Added the required column `shop` to the `ProductConfiguration` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "ProductConfiguration" ADD COLUMN     "colorHex" TEXT,
ADD COLUMN     "colorName" TEXT,
ADD COLUMN     "materialName" TEXT,
ADD COLUMN     "shop" TEXT NOT NULL,
ADD COLUMN     "shopifyOrderId" TEXT,
ADD COLUMN     "shopifyOrderName" TEXT;

-- CreateIndex
CREATE INDEX "ProductConfiguration_shop_idx" ON "ProductConfiguration"("shop");

-- CreateIndex
CREATE INDEX "ProductConfiguration_shopifyOrderId_idx" ON "ProductConfiguration"("shopifyOrderId");

-- CreateIndex
CREATE INDEX "ProductConfiguration_status_idx" ON "ProductConfiguration"("status");
