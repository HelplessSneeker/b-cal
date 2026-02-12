-- CreateIndex
CREATE INDEX "CalendarEntry_startDate_idx" ON "CalendarEntry"("startDate");

-- CreateIndex
CREATE INDEX "CalendarEntry_endDate_idx" ON "CalendarEntry"("endDate");

-- CreateIndex
CREATE INDEX "CalendarEntry_endDate_startDate_idx" ON "CalendarEntry"("endDate", "startDate");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "User"("email");
