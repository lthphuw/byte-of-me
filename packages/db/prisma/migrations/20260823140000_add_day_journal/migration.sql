-- CreateTable
CREATE TABLE "day_entries" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "local_date" DATE NOT NULL,
    "mood" INTEGER,
    "reflection" TEXT,
    "owner_id" TEXT NOT NULL,

    CONSTRAINT "day_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "day_photos" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "file_key" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "caption" TEXT,
    "position" INTEGER NOT NULL DEFAULT 0,
    "day_entry_id" TEXT NOT NULL,
    "owner_id" TEXT NOT NULL,

    CONSTRAINT "day_photos_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "uniq_day_entries_owner_date" ON "day_entries"("owner_id", "local_date");

-- CreateIndex
CREATE UNIQUE INDEX "day_photos_file_key_key" ON "day_photos"("file_key");

-- CreateIndex
CREATE INDEX "day_photos_day_entry_id_position_idx" ON "day_photos"("day_entry_id", "position");

-- AddForeignKey
ALTER TABLE "day_entries" ADD CONSTRAINT "day_entries_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "day_photos" ADD CONSTRAINT "day_photos_day_entry_id_fkey" FOREIGN KEY ("day_entry_id") REFERENCES "day_entries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "day_photos" ADD CONSTRAINT "day_photos_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
