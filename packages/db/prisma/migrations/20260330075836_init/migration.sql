/*
  Warnings:

  - You are about to drop the `Authenticator` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "Authenticator" DROP CONSTRAINT "Authenticator_userId_fkey";

-- DropTable
DROP TABLE "Authenticator";
