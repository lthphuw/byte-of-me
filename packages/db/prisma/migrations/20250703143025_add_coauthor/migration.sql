-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "firstName" TEXT,
    "lastName" TEXT,
    "birthdate" TEXT,
    "greeting" TEXT,
    "tagLine" TEXT,
    "email" TEXT,
    "phoneNumber" TEXT,
    "linkedIn" TEXT,
    "facebook" TEXT,
    "github" TEXT,
    "leetCode" TEXT,
    "twitter" TEXT,
    "portfolio" TEXT,
    "stackOverflow" TEXT,
    "image" TEXT,
    "imageCaption" TEXT,
    "quote" TEXT,
    "bio" TEXT,
    "aboutMe" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_banner_images" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "src" TEXT NOT NULL,
    "caption" TEXT NOT NULL,

    CONSTRAINT "user_banner_images_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "educations" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "timeline" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT,
    "icon" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "educations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "education_sub_items" (
    "id" TEXT NOT NULL,
    "educationId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "education_sub_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tech_stacks" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "logo" TEXT,
    "group" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT NOT NULL,

    CONSTRAINT "tech_stacks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "experience_tech_stacks" (
    "experienceId" TEXT NOT NULL,
    "techstackId" TEXT NOT NULL,

    CONSTRAINT "experience_tech_stacks_pkey" PRIMARY KEY ("techstackId","experienceId")
);

-- CreateTable
CREATE TABLE "experiences" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "company" TEXT NOT NULL,
    "logoUrl" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "experiences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExperienceRole" (
    "id" TEXT NOT NULL,
    "experienceId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),

    CONSTRAINT "ExperienceRole_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tasks" (
    "id" TEXT NOT NULL,
    "experience_role_id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "projects" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "githubLink" TEXT,
    "liveLink" TEXT,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "projects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_coauthor" (
    "projectId" TEXT NOT NULL,
    "coauthorID" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "project_coauthor_pkey" PRIMARY KEY ("projectId","coauthorID")
);

-- CreateTable
CREATE TABLE "Coauthor" (
    "id" TEXT NOT NULL,
    "fullname" TEXT NOT NULL,
    "email" TEXT,

    CONSTRAINT "Coauthor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_tech_stacks" (
    "projectId" TEXT NOT NULL,
    "techstackId" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "project_tech_stacks_pkey" PRIMARY KEY ("projectId","techstackId")
);

-- CreateTable
CREATE TABLE "project_tag" (
    "projectId" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "project_tag_pkey" PRIMARY KEY ("projectId","tagId")
);

-- CreateTable
CREATE TABLE "blogs" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "publishedDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "slug" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "projectId" TEXT,

    CONSTRAINT "blogs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tags" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "blog_tags" (
    "blogId" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "blog_tags_pkey" PRIMARY KEY ("blogId","tagId")
);

-- CreateTable
CREATE TABLE "translations" (
    "id" TEXT NOT NULL,
    "language" TEXT NOT NULL,
    "field" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "userId" TEXT,
    "educationId" TEXT,
    "educationSubItemId" TEXT,
    "techStackId" TEXT,
    "experienceId" TEXT,
    "projectId" TEXT,
    "projectImageId" TEXT,
    "blogId" TEXT,
    "tagId" TEXT,
    "technologyId" TEXT,
    "bannerImageId" TEXT,
    "taskId" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "translations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_phoneNumber_key" ON "users"("phoneNumber");

-- CreateIndex
CREATE UNIQUE INDEX "users_linkedIn_key" ON "users"("linkedIn");

-- CreateIndex
CREATE UNIQUE INDEX "users_facebook_key" ON "users"("facebook");

-- CreateIndex
CREATE UNIQUE INDEX "users_github_key" ON "users"("github");

-- CreateIndex
CREATE UNIQUE INDEX "users_leetCode_key" ON "users"("leetCode");

-- CreateIndex
CREATE UNIQUE INDEX "users_twitter_key" ON "users"("twitter");

-- CreateIndex
CREATE UNIQUE INDEX "users_portfolio_key" ON "users"("portfolio");

-- CreateIndex
CREATE UNIQUE INDEX "users_stackOverflow_key" ON "users"("stackOverflow");

-- CreateIndex
CREATE INDEX "educations_userId_idx" ON "educations"("userId");

-- CreateIndex
CREATE INDEX "education_sub_items_educationId_idx" ON "education_sub_items"("educationId");

-- CreateIndex
CREATE UNIQUE INDEX "tech_stacks_name_key" ON "tech_stacks"("name");

-- CreateIndex
CREATE INDEX "experiences_userId_idx" ON "experiences"("userId");

-- CreateIndex
CREATE INDEX "projects_userId_idx" ON "projects"("userId");

-- CreateIndex
CREATE INDEX "project_coauthor_coauthorID_idx" ON "project_coauthor"("coauthorID");

-- CreateIndex
CREATE INDEX "project_tech_stacks_techstackId_idx" ON "project_tech_stacks"("techstackId");

-- CreateIndex
CREATE INDEX "project_tag_tagId_idx" ON "project_tag"("tagId");

-- CreateIndex
CREATE UNIQUE INDEX "blogs_slug_key" ON "blogs"("slug");

-- CreateIndex
CREATE INDEX "blogs_userId_idx" ON "blogs"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "tags_name_key" ON "tags"("name");

-- CreateIndex
CREATE INDEX "blog_tags_tagId_idx" ON "blog_tags"("tagId");

-- CreateIndex
CREATE INDEX "translations_blogId_idx" ON "translations"("blogId");

-- CreateIndex
CREATE INDEX "translations_educationId_idx" ON "translations"("educationId");

-- CreateIndex
CREATE INDEX "translations_educationSubItemId_idx" ON "translations"("educationSubItemId");

-- CreateIndex
CREATE INDEX "translations_experienceId_idx" ON "translations"("experienceId");

-- CreateIndex
CREATE INDEX "translations_projectId_idx" ON "translations"("projectId");

-- CreateIndex
CREATE INDEX "translations_projectImageId_idx" ON "translations"("projectImageId");

-- CreateIndex
CREATE INDEX "translations_tagId_idx" ON "translations"("tagId");

-- CreateIndex
CREATE INDEX "translations_techStackId_idx" ON "translations"("techStackId");

-- CreateIndex
CREATE INDEX "translations_userId_idx" ON "translations"("userId");

-- AddForeignKey
ALTER TABLE "user_banner_images" ADD CONSTRAINT "user_banner_images_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "educations" ADD CONSTRAINT "educations_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "education_sub_items" ADD CONSTRAINT "education_sub_items_educationId_fkey" FOREIGN KEY ("educationId") REFERENCES "educations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tech_stacks" ADD CONSTRAINT "tech_stacks_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "experience_tech_stacks" ADD CONSTRAINT "experience_tech_stacks_experienceId_fkey" FOREIGN KEY ("experienceId") REFERENCES "experiences"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "experience_tech_stacks" ADD CONSTRAINT "experience_tech_stacks_techstackId_fkey" FOREIGN KEY ("techstackId") REFERENCES "tech_stacks"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "experiences" ADD CONSTRAINT "experiences_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExperienceRole" ADD CONSTRAINT "ExperienceRole_experienceId_fkey" FOREIGN KEY ("experienceId") REFERENCES "experiences"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_experience_role_id_fkey" FOREIGN KEY ("experience_role_id") REFERENCES "ExperienceRole"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_coauthor" ADD CONSTRAINT "project_coauthor_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_coauthor" ADD CONSTRAINT "project_coauthor_coauthorID_fkey" FOREIGN KEY ("coauthorID") REFERENCES "Coauthor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_tech_stacks" ADD CONSTRAINT "project_tech_stacks_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_tech_stacks" ADD CONSTRAINT "project_tech_stacks_techstackId_fkey" FOREIGN KEY ("techstackId") REFERENCES "tech_stacks"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_tag" ADD CONSTRAINT "project_tag_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_tag" ADD CONSTRAINT "project_tag_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "tags"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "blogs" ADD CONSTRAINT "blogs_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "blogs" ADD CONSTRAINT "blogs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "blog_tags" ADD CONSTRAINT "blog_tags_blogId_fkey" FOREIGN KEY ("blogId") REFERENCES "blogs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "blog_tags" ADD CONSTRAINT "blog_tags_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "tags"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "translations" ADD CONSTRAINT "translations_blogId_fkey" FOREIGN KEY ("blogId") REFERENCES "blogs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "translations" ADD CONSTRAINT "translations_educationId_fkey" FOREIGN KEY ("educationId") REFERENCES "educations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "translations" ADD CONSTRAINT "translations_educationSubItemId_fkey" FOREIGN KEY ("educationSubItemId") REFERENCES "education_sub_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "translations" ADD CONSTRAINT "translations_experienceId_fkey" FOREIGN KEY ("experienceId") REFERENCES "experiences"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "translations" ADD CONSTRAINT "translations_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "translations" ADD CONSTRAINT "translations_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "tags"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "translations" ADD CONSTRAINT "translations_techStackId_fkey" FOREIGN KEY ("techStackId") REFERENCES "tech_stacks"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "translations" ADD CONSTRAINT "translations_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "translations" ADD CONSTRAINT "translations_bannerImageId_fkey" FOREIGN KEY ("bannerImageId") REFERENCES "user_banner_images"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "translations" ADD CONSTRAINT "translations_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "tasks"("id") ON DELETE SET NULL ON UPDATE CASCADE;
