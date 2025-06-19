-- AlterTable
ALTER TABLE `translations` ADD COLUMN `bannerImageId` VARCHAR(191) NULL;

-- CreateTable
CREATE TABLE `user_banner_images` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `src` VARCHAR(191) NOT NULL,
    `caption` VARCHAR(191) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `user_banner_images` ADD CONSTRAINT `user_banner_images_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `translations` ADD CONSTRAINT `translations_bannerImageId_fkey` FOREIGN KEY (`bannerImageId`) REFERENCES `user_banner_images`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
