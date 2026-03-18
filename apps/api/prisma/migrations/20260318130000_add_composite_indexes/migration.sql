-- CreateIndex
CREATE INDEX "Session_userId_lastUsedAt_idx" ON "Session"("userId", "lastUsedAt");

-- CreateIndex
CREATE INDEX "CalendarEntry_userId_startDate_idx" ON "CalendarEntry"("userId", "startDate");

-- CreateIndex
CREATE INDEX "CalendarEntry_userId_recurrenceFrequency_idx" ON "CalendarEntry"("userId", "recurrenceFrequency");
