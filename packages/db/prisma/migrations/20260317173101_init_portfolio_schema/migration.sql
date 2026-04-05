/*
  Warnings:

  - You are about to drop the column `birth_date` on the `user_profile_translations` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "user_profile_translations" DROP COLUMN "birth_date";

-- AlterTable
ALTER TABLE "user_profiles" ADD COLUMN     "birth_date" TEXT;
