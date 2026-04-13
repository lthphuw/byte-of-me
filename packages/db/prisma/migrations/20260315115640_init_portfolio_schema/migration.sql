-- CreateTable
CREATE TABLE "sessions"
(
  "id"            TEXT         NOT NULL,
  "session_token" TEXT         NOT NULL,
  "user_id"       TEXT         NOT NULL,
  "expires"       TIMESTAMP(3) NOT NULL,

  CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "verification_tokens"
(
  "identifier" TEXT         NOT NULL,
  "token"      TEXT         NOT NULL,
  "expires"    TIMESTAMP(3) NOT NULL
);

-- CreateTable
CREATE TABLE "accounts"
(
  "id"                  TEXT NOT NULL,
  "user_id"             TEXT NOT NULL,
  "type"                TEXT NOT NULL,
  "provider"            TEXT NOT NULL,
  "provider_account_id" TEXT NOT NULL,
  "refresh_token"       TEXT,
  "access_token"        TEXT,
  "expires_at"          INTEGER,
  "token_type"          TEXT,
  "scope"               TEXT,
  "id_token"            TEXT,
  "session_state"       TEXT,

  CONSTRAINT "accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users"
(
  "id"         TEXT         NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  "email"      TEXT         NOT NULL,

  CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "social_links"
(
  "id"         TEXT         NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  "platform"   TEXT         NOT NULL,
  "url"        TEXT         NOT NULL,
  "sort_order" INTEGER      NOT NULL DEFAULT 0,
  "media_id"   TEXT,
  "user_id"    TEXT         NOT NULL,

  CONSTRAINT "social_links_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_settings"
(
  "id"                TEXT         NOT NULL,
  "created_at"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"        TIMESTAMP(3) NOT NULL,
  "email_verified_at" TIMESTAMP(3),
  "phone_verified_at" TIMESTAMP(3),
  "user_id"           TEXT         NOT NULL,

  CONSTRAINT "user_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_profiles"
(
  "id"         TEXT         NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  "user_id"    TEXT         NOT NULL,

  CONSTRAINT "user_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_profile_translations"
(
  "id"              TEXT         NOT NULL,
  "created_at"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"      TIMESTAMP(3) NOT NULL,
  "language"        TEXT         NOT NULL,
  "display_name"    TEXT,
  "first_name"      TEXT,
  "middle_name"     TEXT,
  "last_name"       TEXT,
  "birth_date"      TEXT,
  "greeting"        TEXT,
  "tag_line"        TEXT,
  "quote"           TEXT,
  "quote_author"    TEXT,
  "bio"             TEXT,
  "about_me"        TEXT,
  "user_profile_id" TEXT         NOT NULL,

  CONSTRAINT "user_profile_translations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "educations"
(
  "id"         TEXT         NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  "start_date" TIMESTAMP(3) NOT NULL,
  "end_date"   TIMESTAMP(3),
  "logo_id"    TEXT         NOT NULL,
  "user_id"    TEXT         NOT NULL,

  CONSTRAINT "educations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "education_translations"
(
  "id"           TEXT         NOT NULL,
  "created_at"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"   TIMESTAMP(3) NOT NULL,
  "language"     TEXT         NOT NULL,
  "title"        TEXT         NOT NULL,
  "description"  TEXT,
  "education_id" TEXT         NOT NULL,

  CONSTRAINT "education_translations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "education_achievements"
(
  "id"           TEXT         NOT NULL,
  "created_at"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"   TIMESTAMP(3) NOT NULL,
  "sort_order"   INTEGER      NOT NULL DEFAULT 0,
  "education_id" TEXT         NOT NULL,

  CONSTRAINT "education_achievements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "education_achievement_translations"
(
  "id"                       TEXT         NOT NULL,
  "created_at"               TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"               TIMESTAMP(3) NOT NULL,
  "language"                 TEXT         NOT NULL,
  "title"                    TEXT         NOT NULL,
  "content"                  TEXT,
  "education_achievement_id" TEXT         NOT NULL,

  CONSTRAINT "education_achievement_translations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "achievement_medias"
(
  "created_at"               TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"               TIMESTAMP(3) NOT NULL,
  "media_id"                 TEXT         NOT NULL,
  "education_achievement_id" TEXT         NOT NULL,

  CONSTRAINT "achievement_medias_pkey" PRIMARY KEY ("education_achievement_id", "media_id")
);

-- CreateTable
CREATE TABLE "tech_stacks"
(
  "id"         TEXT         NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  "name"       TEXT         NOT NULL,
  "slug"       TEXT         NOT NULL,
  "group"      TEXT         NOT NULL,
  "sort_order" INTEGER      NOT NULL DEFAULT 0,
  "logo_id"    TEXT,
  "user_id"    TEXT         NOT NULL,

  CONSTRAINT "tech_stacks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_tech_stacks"
(
  "created_at"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"    TIMESTAMP(3) NOT NULL,
  "project_id"    TEXT         NOT NULL,
  "tech_stack_id" TEXT         NOT NULL,

  CONSTRAINT "project_tech_stacks_pkey" PRIMARY KEY ("project_id", "tech_stack_id")
);

-- CreateTable
CREATE TABLE "company_tech_stacks"
(
  "created_at"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"    TIMESTAMP(3) NOT NULL,
  "company_id"    TEXT         NOT NULL,
  "tech_stack_id" TEXT         NOT NULL,

  CONSTRAINT "company_tech_stacks_pkey" PRIMARY KEY ("tech_stack_id", "company_id")
);

-- CreateTable
CREATE TABLE "companies"
(
  "id"         TEXT         NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  "company"    TEXT         NOT NULL,
  "location"   TEXT         NOT NULL,
  "start_date" TIMESTAMP(3) NOT NULL,
  "end_date"   TIMESTAMP(3),
  "logo_id"    TEXT,
  "user_id"    TEXT         NOT NULL,

  CONSTRAINT "companies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "company_translations"
(
  "id"          TEXT         NOT NULL,
  "created_at"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"  TIMESTAMP(3) NOT NULL,
  "language"    TEXT         NOT NULL,
  "description" TEXT,
  "company_id"  TEXT         NOT NULL,

  CONSTRAINT "company_translations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "roles"
(
  "id"         TEXT         NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  "start_date" TIMESTAMP(3),
  "end_date"   TIMESTAMP(3),
  "company_id" TEXT         NOT NULL,

  CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "role_translations"
(
  "id"          TEXT         NOT NULL,
  "created_at"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"  TIMESTAMP(3) NOT NULL,
  "language"    TEXT         NOT NULL,
  "title"       TEXT         NOT NULL,
  "description" TEXT,
  "role_id"     TEXT         NOT NULL,

  CONSTRAINT "role_translations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tasks"
(
  "id"         TEXT         NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  "sort_order" INTEGER      NOT NULL DEFAULT 0,
  "role_id"    TEXT         NOT NULL,

  CONSTRAINT "tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "task_translations"
(
  "id"         TEXT         NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  "language"   TEXT         NOT NULL,
  "content"    TEXT         NOT NULL,
  "task_id"    TEXT         NOT NULL,

  CONSTRAINT "task_translations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "projects"
(
  "id"           TEXT         NOT NULL,
  "created_at"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"   TIMESTAMP(3) NOT NULL,
  "slug"         TEXT         NOT NULL,
  "github_link"  TEXT,
  "live_link"    TEXT,
  "start_date"   TIMESTAMP(3),
  "end_date"     TIMESTAMP(3),
  "is_published" BOOLEAN      NOT NULL DEFAULT false,
  "user_id"      TEXT         NOT NULL,

  CONSTRAINT "projects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_translations"
(
  "id"          TEXT         NOT NULL,
  "created_at"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"  TIMESTAMP(3) NOT NULL,
  "language"    TEXT         NOT NULL,
  "title"       TEXT         NOT NULL,
  "description" TEXT,
  "project_id"  TEXT         NOT NULL,

  CONSTRAINT "project_translations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_coauthors"
(
  "created_at"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"  TIMESTAMP(3) NOT NULL,
  "project_id"  TEXT         NOT NULL,
  "coauthor_id" TEXT         NOT NULL,

  CONSTRAINT "project_coauthors_pkey" PRIMARY KEY ("project_id", "coauthor_id")
);

-- CreateTable
CREATE TABLE "coauthors"
(
  "id"         TEXT         NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  "full_name"  TEXT         NOT NULL,
  "email"      TEXT,

  CONSTRAINT "coauthors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "blogs"
(
  "id"             TEXT         NOT NULL,
  "created_at"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"     TIMESTAMP(3) NOT NULL,
  "slug"           TEXT         NOT NULL,
  "published_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "is_published"   BOOLEAN      NOT NULL DEFAULT false,
  "user_id"        TEXT         NOT NULL,
  "project_id"     TEXT,

  CONSTRAINT "blogs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "blog_translations"
(
  "id"         TEXT         NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  "language"   TEXT         NOT NULL,
  "title"      TEXT         NOT NULL,
  "content"    TEXT         NOT NULL,
  "blog_id"    TEXT         NOT NULL,

  CONSTRAINT "blog_translations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tags"
(
  "id"         TEXT         NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  "slug"       TEXT         NOT NULL,

  CONSTRAINT "tags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tag_translations"
(
  "id"         TEXT         NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  "language"   TEXT         NOT NULL,
  "name"       TEXT         NOT NULL,
  "tag_id"     TEXT         NOT NULL,

  CONSTRAINT "tag_translations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "blog_tags"
(
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  "blog_id"    TEXT         NOT NULL,
  "tag_id"     TEXT         NOT NULL,

  CONSTRAINT "blog_tags_pkey" PRIMARY KEY ("blog_id", "tag_id")
);

-- CreateTable
CREATE TABLE "project_tags"
(
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  "project_id" TEXT         NOT NULL,
  "tag_id"     TEXT         NOT NULL,

  CONSTRAINT "project_tags_pkey" PRIMARY KEY ("project_id", "tag_id")
);

-- CreateTable
CREATE TABLE "translations"
(
  "id"            TEXT         NOT NULL,
  "created_at"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"    TIMESTAMP(3) NOT NULL,
  "language"      TEXT         NOT NULL,
  "source_text"   TEXT         NOT NULL,
  "translated"    TEXT         NOT NULL,
  "resource_type" TEXT,
  "resource_id"   TEXT,

  CONSTRAINT "translations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "media"
(
  "id"         TEXT         NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  "file_name"  TEXT         NOT NULL,
  "file_key"   TEXT         NOT NULL,
  "mime_type"  TEXT         NOT NULL,
  "size"       INTEGER      NOT NULL,
  "provider"   TEXT         NOT NULL,
  "bucket"     TEXT         NOT NULL,
  "url"        TEXT         NOT NULL,
  "user_id"    TEXT,

  CONSTRAINT "media_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "sessions_session_token_key" ON "sessions" ("session_token");

-- CreateIndex
CREATE UNIQUE INDEX "verification_tokens_token_key" ON "verification_tokens" ("token");

-- CreateIndex
CREATE UNIQUE INDEX "verification_tokens_identifier_token_key" ON "verification_tokens" ("identifier", "token");

-- CreateIndex
CREATE UNIQUE INDEX "uq_accounts_provider_provider_account_id" ON "accounts" ("provider", "provider_account_id");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users" ("email");

-- CreateIndex
CREATE UNIQUE INDEX "social_links_user_id_platform_key" ON "social_links" ("user_id", "platform");

-- CreateIndex
CREATE UNIQUE INDEX "user_settings_user_id_key" ON "user_settings" ("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_profiles_user_id_key" ON "user_profiles" ("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_profile_translations_user_profile_id_language_key" ON "user_profile_translations" ("user_profile_id", "language");

-- CreateIndex
CREATE INDEX "idx_educations_user_id" ON "educations" ("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "education_translations_education_id_language_key" ON "education_translations" ("education_id", "language");

-- CreateIndex
CREATE INDEX "idx_education_achievement_education_id" ON "education_achievements" ("education_id");

-- CreateIndex
CREATE UNIQUE INDEX "education_achievement_translations_education_achievement_id_key" ON "education_achievement_translations" ("education_achievement_id", "language");

-- CreateIndex
CREATE INDEX "idx_achievement_medias" ON "achievement_medias" ("media_id");

-- CreateIndex
CREATE UNIQUE INDEX "tech_stacks_name_key" ON "tech_stacks" ("name");

-- CreateIndex
CREATE UNIQUE INDEX "tech_stacks_slug_key" ON "tech_stacks" ("slug");

-- CreateIndex
CREATE INDEX "idx_project_tech_stacks_tech_stack_id" ON "project_tech_stacks" ("tech_stack_id");

-- CreateIndex
CREATE INDEX "idx_companies_user_id" ON "companies" ("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "company_translations_company_id_language_key" ON "company_translations" ("company_id", "language");

-- CreateIndex
CREATE INDEX "idx_roles_company_id" ON "roles" ("company_id");

-- CreateIndex
CREATE UNIQUE INDEX "uidx_role_translation_role_id_language" ON "role_translations" ("role_id", "language");

-- CreateIndex
CREATE INDEX "idx_tasks_role_id" ON "tasks" ("role_id");

-- CreateIndex
CREATE UNIQUE INDEX "task_translations_task_id_language_key" ON "task_translations" ("task_id", "language");

-- CreateIndex
CREATE UNIQUE INDEX "projects_slug_key" ON "projects" ("slug");

-- CreateIndex
CREATE INDEX "idx_projects_user_id" ON "projects" ("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "project_translations_project_id_language_key" ON "project_translations" ("project_id", "language");

-- CreateIndex
CREATE INDEX "idx_project_coauthor_coauthor_id" ON "project_coauthors" ("coauthor_id");

-- CreateIndex
CREATE UNIQUE INDEX "blogs_slug_key" ON "blogs" ("slug");

-- CreateIndex
CREATE INDEX "idx_blogs_user_id" ON "blogs" ("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "blog_translations_blog_id_language_key" ON "blog_translations" ("blog_id", "language");

-- CreateIndex
CREATE UNIQUE INDEX "tags_slug_key" ON "tags" ("slug");

-- CreateIndex
CREATE UNIQUE INDEX "tag_translations_name_key" ON "tag_translations" ("name");

-- CreateIndex
CREATE UNIQUE INDEX "tag_translations_tag_id_language_key" ON "tag_translations" ("tag_id", "language");

-- CreateIndex
CREATE INDEX "idx_blog_tags_tag_id" ON "blog_tags" ("tag_id");

-- CreateIndex
CREATE INDEX "idx_project_tag_tag_id" ON "project_tags" ("tag_id");

-- CreateIndex
CREATE INDEX "idx_translations_resource" ON "translations" ("resource_type", "resource_id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_translations_source_text_language" ON "translations" ("source_text", "language");

-- CreateIndex
CREATE UNIQUE INDEX "media_file_key_key" ON "media" ("file_key");

-- AddForeignKey
ALTER TABLE "sessions"
  ADD CONSTRAINT "sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accounts"
  ADD CONSTRAINT "accounts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "social_links"
  ADD CONSTRAINT "social_links_media_id_fkey" FOREIGN KEY ("media_id") REFERENCES "media" ("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "social_links"
  ADD CONSTRAINT "social_links_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_settings"
  ADD CONSTRAINT "user_settings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_profiles"
  ADD CONSTRAINT "user_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_profile_translations"
  ADD CONSTRAINT "user_profile_translations_user_profile_id_fkey" FOREIGN KEY ("user_profile_id") REFERENCES "user_profiles" ("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "educations"
  ADD CONSTRAINT "educations_logo_id_fkey" FOREIGN KEY ("logo_id") REFERENCES "media" ("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "educations"
  ADD CONSTRAINT "educations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "education_translations"
  ADD CONSTRAINT "education_translations_education_id_fkey" FOREIGN KEY ("education_id") REFERENCES "educations" ("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "education_achievements"
  ADD CONSTRAINT "education_achievements_education_id_fkey" FOREIGN KEY ("education_id") REFERENCES "educations" ("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "education_achievement_translations"
  ADD CONSTRAINT "education_achievement_translations_education_achievement_i_fkey" FOREIGN KEY ("education_achievement_id") REFERENCES "education_achievements" ("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "achievement_medias"
  ADD CONSTRAINT "achievement_medias_media_id_fkey" FOREIGN KEY ("media_id") REFERENCES "media" ("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "achievement_medias"
  ADD CONSTRAINT "achievement_medias_education_achievement_id_fkey" FOREIGN KEY ("education_achievement_id") REFERENCES "education_achievements" ("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tech_stacks"
  ADD CONSTRAINT "tech_stacks_logo_id_fkey" FOREIGN KEY ("logo_id") REFERENCES "media" ("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tech_stacks"
  ADD CONSTRAINT "tech_stacks_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_tech_stacks"
  ADD CONSTRAINT "project_tech_stacks_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects" ("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_tech_stacks"
  ADD CONSTRAINT "project_tech_stacks_tech_stack_id_fkey" FOREIGN KEY ("tech_stack_id") REFERENCES "tech_stacks" ("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "company_tech_stacks"
  ADD CONSTRAINT "company_tech_stacks_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies" ("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "company_tech_stacks"
  ADD CONSTRAINT "company_tech_stacks_tech_stack_id_fkey" FOREIGN KEY ("tech_stack_id") REFERENCES "tech_stacks" ("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "companies"
  ADD CONSTRAINT "companies_logo_id_fkey" FOREIGN KEY ("logo_id") REFERENCES "media" ("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "companies"
  ADD CONSTRAINT "companies_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "company_translations"
  ADD CONSTRAINT "company_translations_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies" ("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "roles"
  ADD CONSTRAINT "roles_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies" ("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_translations"
  ADD CONSTRAINT "role_translations_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles" ("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasks"
  ADD CONSTRAINT "tasks_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles" ("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_translations"
  ADD CONSTRAINT "task_translations_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "tasks" ("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "projects"
  ADD CONSTRAINT "projects_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_translations"
  ADD CONSTRAINT "project_translations_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects" ("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_coauthors"
  ADD CONSTRAINT "project_coauthors_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects" ("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_coauthors"
  ADD CONSTRAINT "project_coauthors_coauthor_id_fkey" FOREIGN KEY ("coauthor_id") REFERENCES "coauthors" ("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "blogs"
  ADD CONSTRAINT "blogs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "blogs"
  ADD CONSTRAINT "blogs_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects" ("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "blog_translations"
  ADD CONSTRAINT "blog_translations_blog_id_fkey" FOREIGN KEY ("blog_id") REFERENCES "blogs" ("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tag_translations"
  ADD CONSTRAINT "tag_translations_tag_id_fkey" FOREIGN KEY ("tag_id") REFERENCES "tags" ("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "blog_tags"
  ADD CONSTRAINT "blog_tags_blog_id_fkey" FOREIGN KEY ("blog_id") REFERENCES "blogs" ("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "blog_tags"
  ADD CONSTRAINT "blog_tags_tag_id_fkey" FOREIGN KEY ("tag_id") REFERENCES "tags" ("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_tags"
  ADD CONSTRAINT "project_tags_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects" ("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_tags"
  ADD CONSTRAINT "project_tags_tag_id_fkey" FOREIGN KEY ("tag_id") REFERENCES "tags" ("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "media"
  ADD CONSTRAINT "media_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE;
