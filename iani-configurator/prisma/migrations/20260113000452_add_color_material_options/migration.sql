-- DropForeignKey
ALTER TABLE "CustomizationOption" DROP CONSTRAINT "CustomizationOption_product3DId_fkey";

-- AlterTable
ALTER TABLE "Product3D" ADD COLUMN     "basePrice" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "useShopifyModel" BOOLEAN NOT NULL DEFAULT true,
ALTER COLUMN "baseModelUrl" DROP NOT NULL;

-- CreateTable
CREATE TABLE "ColorOption" (
    "id" TEXT NOT NULL,
    "product3DId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "hexCode" TEXT NOT NULL,
    "price" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ColorOption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MaterialOption" (
    "id" TEXT NOT NULL,
    "product3DId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "extraCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MaterialOption_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ColorOption_product3DId_idx" ON "ColorOption"("product3DId");

-- CreateIndex
CREATE INDEX "MaterialOption_product3DId_idx" ON "MaterialOption"("product3DId");

-- AddForeignKey
ALTER TABLE "ColorOption" ADD CONSTRAINT "ColorOption_product3DId_fkey" FOREIGN KEY ("product3DId") REFERENCES "Product3D"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaterialOption" ADD CONSTRAINT "MaterialOption_product3DId_fkey" FOREIGN KEY ("product3DId") REFERENCES "Product3D"("id") ON DELETE CASCADE ON UPDATE CASCADE;
