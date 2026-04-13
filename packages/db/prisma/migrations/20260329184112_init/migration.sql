/*
  Warnings:

  - A unique constraint covering the columns `[project_id]` on the table `blogs` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "blogs_project_id_key" ON "blogs" ("project_id");
