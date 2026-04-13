-- AlterTable
ALTER TABLE "blogs"
  ADD COLUMN "cover_image_id" TEXT,
ADD COLUMN     "mediaId" TEXT,
ADD COLUMN     "reading_time" INTEGER;

-- AddForeignKey
ALTER TABLE "blogs"
  ADD CONSTRAINT "blogs_mediaId_fkey" FOREIGN KEY ("mediaId") REFERENCES "media" ("id") ON DELETE SET NULL ON UPDATE CASCADE;
