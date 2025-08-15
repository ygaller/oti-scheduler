-- AlterTable
ALTER TABLE "activities" RENAME CONSTRAINT "blocked_periods_pkey" TO "activities_pkey";

-- CreateTable
CREATE TABLE "session_patients" (
    "id" TEXT NOT NULL,
    "session_id" TEXT NOT NULL,
    "patient_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "session_patients_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "session_patients_session_id_patient_id_key" ON "session_patients"("session_id", "patient_id");

-- AddForeignKey
ALTER TABLE "session_patients" ADD CONSTRAINT "session_patients_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "session_patients" ADD CONSTRAINT "session_patients_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;
