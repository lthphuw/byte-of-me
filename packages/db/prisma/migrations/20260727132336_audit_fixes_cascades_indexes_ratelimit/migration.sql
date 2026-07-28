/*
  Warnings:

  - You are about to drop the `page_views` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "companies" DROP CONSTRAINT "companies_logo_id_fkey";

-- DropForeignKey
ALTER TABLE "educations" DROP CONSTRAINT "educations_logo_id_fkey";

-- DropForeignKey
ALTER TABLE "page_views" DROP CONSTRAINT "page_views_blog_id_fkey";

-- DropForeignKey
ALTER TABLE "page_views" DROP CONSTRAINT "page_views_project_id_fkey";

-- DropForeignKey
ALTER TABLE "page_views" DROP CONSTRAINT "page_views_userId_fkey";

-- DropForeignKey
ALTER TABLE "tech_stacks" DROP CONSTRAINT "tech_stacks_logo_id_fkey";

-- DropIndex
DROP INDEX "idx_blogs_publish_scheduler";

-- DropIndex
DROP INDEX "idx_comments_blog_id";

-- DropIndex
DROP INDEX "idx_interactions_blog_id";

-- DropIndex
DROP INDEX "idx_projects_user_id";

-- DropIndex
DROP INDEX "tag_translations_name_key";

-- AlterTable
ALTER TABLE "educations" ALTER COLUMN "sortOrder" SET DEFAULT 0;

-- AlterTable
-- IF NOT EXISTS: these columns exist in databases that were pushed before the
-- migration history recorded them (schema drift) — deploy must not fail there.
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "image" TEXT;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "name" TEXT;

-- DropTable
DROP TABLE "page_views";

-- CreateTable
CREATE TABLE "rate_limit_hits" (
    "key" TEXT NOT NULL,
    "window_start" TIMESTAMP(3) NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "rate_limit_hits_pkey" PRIMARY KEY ("key","window_start")
);

-- CreateIndex
CREATE INDEX "idx_accounts_user_id" ON "accounts"("user_id");

-- CreateIndex
CREATE INDEX "idx_blog_view_logs_viewer_id" ON "blog_view_logs"("viewer_id");

-- CreateIndex
CREATE INDEX "idx_blogs_cover_image_id" ON "blogs"("cover_image_id");

-- CreateIndex
CREATE INDEX "idx_comments_blog_thread" ON "comments"("blog_id", "parent_id", "is_deleted");

-- CreateIndex
CREATE INDEX "idx_companies_logo_id" ON "companies"("logo_id");

-- CreateIndex
CREATE INDEX "idx_contact_user_created" ON "contact_messages"("userId", "created_at");

-- CreateIndex
CREATE INDEX "idx_educations_logo_id" ON "educations"("logo_id");

-- CreateIndex
CREATE INDEX "idx_interactions_blog_type" ON "interactions"("blog_id", "type");

-- CreateIndex
CREATE INDEX "idx_media_user_id" ON "media"("user_id");

-- CreateIndex
CREATE INDEX "idx_projects_public_list" ON "projects"("user_id", "is_published", "start_date");

-- CreateIndex
CREATE INDEX "idx_sessions_user_id" ON "sessions"("user_id");

-- CreateIndex
CREATE INDEX "idx_tech_stacks_user_id" ON "tech_stacks"("user_id");

-- CreateIndex
CREATE INDEX "idx_tech_stacks_logo_id" ON "tech_stacks"("logo_id");

-- AddForeignKey
ALTER TABLE "educations" ADD CONSTRAINT "educations_logo_id_fkey" FOREIGN KEY ("logo_id") REFERENCES "media"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tech_stacks" ADD CONSTRAINT "tech_stacks_logo_id_fkey" FOREIGN KEY ("logo_id") REFERENCES "media"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "companies" ADD CONSTRAINT "companies_logo_id_fkey" FOREIGN KEY ("logo_id") REFERENCES "media"("id") ON DELETE SET NULL ON UPDATE CASCADE;
