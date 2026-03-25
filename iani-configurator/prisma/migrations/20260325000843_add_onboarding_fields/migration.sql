-- AlterTable
ALTER TABLE "Shop" ADD COLUMN     "hasAddedAppBlock" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "hasPreviewedStore" BOOLEAN NOT NULL DEFAULT false;
