-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "shop" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "isOnline" BOOLEAN NOT NULL DEFAULT false,
    "scope" TEXT,
    "expires" TIMESTAMP(3),
    "accessToken" TEXT NOT NULL,
    "userId" BIGINT,
    "firstName" TEXT,
    "lastName" TEXT,
    "email" TEXT,
    "accountOwner" BOOLEAN NOT NULL DEFAULT false,
    "locale" TEXT,
    "collaborator" BOOLEAN DEFAULT false,
    "emailVerified" BOOLEAN DEFAULT false,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Product3D" (
    "id" TEXT NOT NULL,
    "shopifyProductId" TEXT NOT NULL,
    "shop" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "baseModelUrl" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Product3D_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustomizationOption" (
    "id" TEXT NOT NULL,
    "product3DId" TEXT NOT NULL,
    "optionType" TEXT NOT NULL,
    "optionName" TEXT NOT NULL,
    "optionValue" TEXT NOT NULL,
    "price" DOUBLE PRECISION,

    CONSTRAINT "CustomizationOption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductConfiguration" (
    "id" TEXT NOT NULL,
    "product3DId" TEXT NOT NULL,
    "customerEmail" TEXT,
    "shopifyCustomerId" TEXT,
    "configurationData" JSONB NOT NULL,
    "previewImageUrl" TEXT,
    "totalPrice" DOUBLE PRECISION NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductConfiguration_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Product3D_shopifyProductId_shop_key" ON "Product3D"("shopifyProductId", "shop");

-- CreateIndex
CREATE INDEX "CustomizationOption_product3DId_idx" ON "CustomizationOption"("product3DId");

-- CreateIndex
CREATE INDEX "ProductConfiguration_product3DId_idx" ON "ProductConfiguration"("product3DId");

-- CreateIndex
CREATE INDEX "ProductConfiguration_customerEmail_idx" ON "ProductConfiguration"("customerEmail");

-- CreateIndex
CREATE INDEX "ProductConfiguration_shopifyCustomerId_idx" ON "ProductConfiguration"("shopifyCustomerId");

-- AddForeignKey
ALTER TABLE "CustomizationOption" ADD CONSTRAINT "CustomizationOption_product3DId_fkey" FOREIGN KEY ("product3DId") REFERENCES "Product3D"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductConfiguration" ADD CONSTRAINT "ProductConfiguration_product3DId_fkey" FOREIGN KEY ("product3DId") REFERENCES "Product3D"("id") ON DELETE CASCADE ON UPDATE CASCADE;
