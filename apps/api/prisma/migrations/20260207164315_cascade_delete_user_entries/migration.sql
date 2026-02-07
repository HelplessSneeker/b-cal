-- DropForeignKey
ALTER TABLE "CalendarEntry" DROP CONSTRAINT "CalendarEntry_userId_fkey";

-- AddForeignKey
ALTER TABLE "CalendarEntry" ADD CONSTRAINT "CalendarEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
