/*
  Warnings:

  - Added the required column `sortOrder` to the `educations` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "educations" ADD COLUMN     "sortOrder" INTEGER NOT NULL,
ALTER COLUMN "logo_id" DROP NOT NULL;
