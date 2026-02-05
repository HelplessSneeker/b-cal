/*
  Warnings:

  - Made the column `userId` on table `CalenderEntry` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "CalenderEntry" DROP CONSTRAINT "CalenderEntry_userId_fkey";

-- AlterTable
ALTER TABLE "CalenderEntry" ALTER COLUMN "userId" SET NOT NULL;

-- AddForeignKey
ALTER TABLE "CalenderEntry" ADD CONSTRAINT "CalenderEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
