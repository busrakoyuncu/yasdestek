-- DropIndex
DROP INDEX "ContentPage_slug_key";

-- AlterTable
ALTER TABLE "ContentPage" ADD COLUMN     "locale" TEXT NOT NULL DEFAULT 'tr';

-- CreateIndex
CREATE UNIQUE INDEX "ContentPage_slug_locale_key" ON "ContentPage"("slug", "locale");

