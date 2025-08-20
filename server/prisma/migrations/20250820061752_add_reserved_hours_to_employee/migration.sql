-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_employees" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "first_name" TEXT NOT NULL,
    "last_name" TEXT,
    "role_id" TEXT NOT NULL,
    "weekly_sessions_count" INTEGER NOT NULL,
    "working_hours" TEXT NOT NULL,
    "reserved_hours" TEXT NOT NULL DEFAULT '[]',
    "color" TEXT NOT NULL DEFAULT '#845ec2',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "employees_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_employees" ("color", "created_at", "first_name", "id", "is_active", "last_name", "role_id", "updated_at", "weekly_sessions_count", "working_hours") SELECT "color", "created_at", "first_name", "id", "is_active", "last_name", "role_id", "updated_at", "weekly_sessions_count", "working_hours" FROM "employees";
DROP TABLE "employees";
ALTER TABLE "new_employees" RENAME TO "employees";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
