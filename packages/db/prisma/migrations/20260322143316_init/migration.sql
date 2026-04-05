/*
  Warnings:

  - You are about to drop the column `media_id` on the `social_links` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "social_links" DROP CONSTRAINT "social_links_media_id_fkey";

-- AlterTable
ALTER TABLE "social_links" DROP COLUMN "media_id";
