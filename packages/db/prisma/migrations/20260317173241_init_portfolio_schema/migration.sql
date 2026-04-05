/*
  Warnings:

  - You are about to drop the column `birth_date` on the `user_profiles` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "user_profiles" DROP COLUMN "birth_date",
ADD COLUMN     "birthdate" TIMESTAMP(3);
