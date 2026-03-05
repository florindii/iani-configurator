-- CreateTable
CREATE TABLE "ConfigurationPreview" (
    "id" TEXT NOT NULL,
    "shop" TEXT NOT NULL,
    "imageData" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConfigurationPreview_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ConfigurationPreview_shop_idx" ON "ConfigurationPreview"("shop");
