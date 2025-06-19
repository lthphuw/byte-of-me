/*
  Warnings:

  - Added the required column `userId` to the `tech_stacks` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `tech_stacks` ADD COLUMN `userId` VARCHAR(191) NOT NULL;

-- AddForeignKey
ALTER TABLE `tech_stacks` ADD CONSTRAINT `tech_stacks_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
