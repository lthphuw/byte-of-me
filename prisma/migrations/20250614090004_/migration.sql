/*
  Warnings:

  - A unique constraint covering the columns `[phoneNumber]` on the table `users` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[linkedIn]` on the table `users` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[facebook]` on the table `users` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[github]` on the table `users` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[leetCode]` on the table `users` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[twitter]` on the table `users` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[portfolio]` on the table `users` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[stackOverflow]` on the table `users` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE `users` ADD COLUMN `facebook` VARCHAR(255) NULL,
    ADD COLUMN `github` VARCHAR(255) NULL,
    ADD COLUMN `leetCode` VARCHAR(255) NULL,
    ADD COLUMN `linkedIn` VARCHAR(255) NULL,
    ADD COLUMN `phoneNumber` VARCHAR(20) NULL,
    ADD COLUMN `portfolio` VARCHAR(255) NULL,
    ADD COLUMN `stackOverflow` VARCHAR(255) NULL,
    ADD COLUMN `twitter` VARCHAR(255) NULL,
    MODIFY `image` VARCHAR(255) NULL,
    MODIFY `quote` TEXT NULL;

-- CreateIndex
CREATE UNIQUE INDEX `users_phoneNumber_key` ON `users`(`phoneNumber`);

-- CreateIndex
CREATE UNIQUE INDEX `users_linkedIn_key` ON `users`(`linkedIn`);

-- CreateIndex
CREATE UNIQUE INDEX `users_facebook_key` ON `users`(`facebook`);

-- CreateIndex
CREATE UNIQUE INDEX `users_github_key` ON `users`(`github`);

-- CreateIndex
CREATE UNIQUE INDEX `users_leetCode_key` ON `users`(`leetCode`);

-- CreateIndex
CREATE UNIQUE INDEX `users_twitter_key` ON `users`(`twitter`);

-- CreateIndex
CREATE UNIQUE INDEX `users_portfolio_key` ON `users`(`portfolio`);

-- CreateIndex
CREATE UNIQUE INDEX `users_stackOverflow_key` ON `users`(`stackOverflow`);
