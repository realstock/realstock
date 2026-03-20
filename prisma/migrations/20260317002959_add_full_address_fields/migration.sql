-- AlterTable
ALTER TABLE "properties" ADD COLUMN     "country" TEXT DEFAULT 'Brasil',
ADD COLUMN     "google_maps_link" TEXT,
ADD COLUMN     "state" TEXT,
ADD COLUMN     "street" TEXT,
ADD COLUMN     "zip_code" TEXT;
