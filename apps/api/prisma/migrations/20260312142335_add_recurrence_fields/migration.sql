-- AlterTable
ALTER TABLE "CalendarEntry" ADD COLUMN     "recurrenceByDay" TEXT,
ADD COLUMN     "recurrenceFrequency" TEXT,
ADD COLUMN     "recurrenceUntil" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "RecurrenceException" (
    "id" TEXT NOT NULL,
    "calendarEntryId" TEXT NOT NULL,
    "originalDate" TIMESTAMP(3) NOT NULL,
    "isCancelled" BOOLEAN NOT NULL DEFAULT false,
    "title" TEXT,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "content" TEXT,
    "wholeDay" BOOLEAN,
    "updatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RecurrenceException_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RecurrenceException_calendarEntryId_idx" ON "RecurrenceException"("calendarEntryId");

-- CreateIndex
CREATE UNIQUE INDEX "RecurrenceException_calendarEntryId_originalDate_key" ON "RecurrenceException"("calendarEntryId", "originalDate");

-- CreateIndex
CREATE INDEX "CalendarEntry_recurrenceFrequency_idx" ON "CalendarEntry"("recurrenceFrequency");

-- AddForeignKey
ALTER TABLE "RecurrenceException" ADD CONSTRAINT "RecurrenceException_calendarEntryId_fkey" FOREIGN KEY ("calendarEntryId") REFERENCES "CalendarEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE;
