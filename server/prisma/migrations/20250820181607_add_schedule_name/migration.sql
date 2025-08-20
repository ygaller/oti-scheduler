/*
  Warnings:

  - Added the required column `name` to the `schedules` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_schedules" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "generated_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);
INSERT INTO "new_schedules" ("created_at", "generated_at", "id", "updated_at", "name") SELECT "created_at", "generated_at", "id", "updated_at", '2025 - 2026' FROM "schedules";
DROP TABLE "schedules";
ALTER TABLE "new_schedules" RENAME TO "schedules";
CREATE UNIQUE INDEX "schedules_name_key" ON "schedules"("name");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
