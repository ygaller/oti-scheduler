/*
  Warnings:

  - You are about to drop the column `is_active` on the `activities` table. All the data in the column will be lost.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_activities" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "color" TEXT NOT NULL DEFAULT '#ff6b6b',
    "default_start_time" TEXT,
    "default_end_time" TEXT,
    "day_overrides" TEXT NOT NULL DEFAULT '{}',
    "is_blocking" BOOLEAN NOT NULL DEFAULT false,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);
INSERT INTO "new_activities" ("color", "created_at", "day_overrides", "default_end_time", "default_start_time", "id", "is_blocking", "name", "updated_at") SELECT "color", "created_at", "day_overrides", "default_end_time", "default_start_time", "id", "is_blocking", "name", "updated_at" FROM "activities";
DROP TABLE "activities";
ALTER TABLE "new_activities" RENAME TO "activities";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
