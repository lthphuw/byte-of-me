/*
  Warnings:

  - You are about to drop the column `mediaId` on the `blogs` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "blogs" DROP CONSTRAINT "blogs_mediaId_fkey";

-- AlterTable
ALTER TABLE "blogs" DROP COLUMN "mediaId",
ALTER COLUMN "published_date" DROP NOT NULL;

-- CreateTable
CREATE TABLE "blog_view_logs" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "blog_id" TEXT NOT NULL,
    "reading_time" INTEGER,
    "is_anonymous" BOOLEAN NOT NULL DEFAULT true,
    "viewer_id" TEXT,
    "referrer" TEXT,
    "device_type" TEXT,
    "browser" TEXT,
    "country_code" TEXT,

    CONSTRAINT "blog_view_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "idx_blog_view_logs_blog_id" ON "blog_view_logs"("blog_id");

-- CreateIndex
CREATE INDEX "idx_blog_logs_time_series" ON "blog_view_logs"("blog_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "idx_blog_logs_device" ON "blog_view_logs"("blog_id", "device_type");

-- CreateIndex
CREATE INDEX "idx_blog_logs_country" ON "blog_view_logs"("blog_id", "country_code");

-- CreateIndex
CREATE INDEX "idx_blogs_published_feed" ON "blogs"("is_published", "published_date" DESC);

-- CreateIndex
CREATE INDEX "idx_blogs_publish_scheduler" ON "blogs"("is_published", "published_date");

-- AddForeignKey
ALTER TABLE "blogs" ADD CONSTRAINT "blogs_cover_image_id_fkey" FOREIGN KEY ("cover_image_id") REFERENCES "media"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "blog_view_logs" ADD CONSTRAINT "blog_view_logs_blog_id_fkey" FOREIGN KEY ("blog_id") REFERENCES "blogs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "blog_view_logs" ADD CONSTRAINT "blog_view_logs_viewer_id_fkey" FOREIGN KEY ("viewer_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
