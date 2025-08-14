-- CreateTable
CREATE TABLE "blocked_periods" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT NOT NULL DEFAULT '#ff6b6b',
    "default_start_time" TEXT,
    "default_end_time" TEXT,
    "day_overrides" JSONB NOT NULL DEFAULT '{}',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "blocked_periods_pkey" PRIMARY KEY ("id")
);

-- Insert existing blocked periods from the system config
-- This migration will be run after we create the data migration function
