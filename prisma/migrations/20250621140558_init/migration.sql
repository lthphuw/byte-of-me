/*
  Warnings:

  - The primary key for the `project_tech_stacks` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `techStackId` on the `project_tech_stacks` table. All the data in the column will be lost.
  - You are about to drop the `project_images` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `techstackId` to the `project_tech_stacks` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE `project_images` DROP FOREIGN KEY `project_images_projectId_fkey`;

-- DropForeignKey
ALTER TABLE `project_tech_stacks` DROP FOREIGN KEY `project_tech_stacks_techStackId_fkey`;

-- DropForeignKey
ALTER TABLE `translations` DROP FOREIGN KEY `translations_projectImageId_fkey`;

-- DropIndex
DROP INDEX `project_tech_stacks_techStackId_fkey` ON `project_tech_stacks`;

-- AlterTable
ALTER TABLE `blogs` ADD COLUMN `projectId` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `project_tech_stacks` DROP PRIMARY KEY,
    DROP COLUMN `techStackId`,
    ADD COLUMN `techstackId` VARCHAR(191) NOT NULL,
    ADD PRIMARY KEY (`projectId`, `techstackId`);

-- DropTable
DROP TABLE `project_images`;

-- CreateTable
CREATE TABLE `project_tag` (
    `projectId` VARCHAR(191) NOT NULL,
    `tagId` VARCHAR(191) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `project_tagid_fkey`(`tagId`),
    PRIMARY KEY (`projectId`, `tagId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `project_tech_stacks_techStackId_fkey` ON `project_tech_stacks`(`techstackId`);

-- AddForeignKey
ALTER TABLE `project_tech_stacks` ADD CONSTRAINT `project_tech_stacks_techstackId_fkey` FOREIGN KEY (`techstackId`) REFERENCES `tech_stacks`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `project_tag` ADD CONSTRAINT `project_tag_projectId_fkey` FOREIGN KEY (`projectId`) REFERENCES `projects`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `project_tag` ADD CONSTRAINT `project_tag_tagId_fkey` FOREIGN KEY (`tagId`) REFERENCES `tags`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `blogs` ADD CONSTRAINT `blogs_projectId_fkey` FOREIGN KEY (`projectId`) REFERENCES `projects`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
