-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_sessions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "room_id" TEXT NOT NULL,
    "schedule_id" TEXT NOT NULL,
    "day" TEXT NOT NULL,
    "start_time" TEXT NOT NULL,
    "end_time" TEXT NOT NULL,
    "notes" TEXT,
    "every_two_weeks" BOOLEAN NOT NULL DEFAULT false,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "sessions_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "rooms" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "sessions_schedule_id_fkey" FOREIGN KEY ("schedule_id") REFERENCES "schedules" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_sessions" ("created_at", "day", "end_time", "id", "notes", "room_id", "schedule_id", "start_time", "updated_at") SELECT "created_at", "day", "end_time", "id", "notes", "room_id", "schedule_id", "start_time", "updated_at" FROM "sessions";
DROP TABLE "sessions";
ALTER TABLE "new_sessions" RENAME TO "sessions";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
