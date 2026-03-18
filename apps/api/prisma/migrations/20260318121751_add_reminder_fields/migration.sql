-- AlterTable
ALTER TABLE "CalendarEntry" ADD COLUMN     "reminderAmount" INTEGER,
ADD COLUMN     "reminderType" TEXT,
ADD COLUMN     "reminderUnit" TEXT;

-- CreateTable
CREATE TABLE "ReminderSent" (
    "id" TEXT NOT NULL,
    "calendarEntryId" TEXT NOT NULL,
    "occurrenceDate" TIMESTAMP(3) NOT NULL,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReminderSent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ReminderSent_calendarEntryId_idx" ON "ReminderSent"("calendarEntryId");

-- CreateIndex
CREATE UNIQUE INDEX "ReminderSent_calendarEntryId_occurrenceDate_key" ON "ReminderSent"("calendarEntryId", "occurrenceDate");

-- AddForeignKey
ALTER TABLE "ReminderSent" ADD CONSTRAINT "ReminderSent_calendarEntryId_fkey" FOREIGN KEY ("calendarEntryId") REFERENCES "CalendarEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE;
