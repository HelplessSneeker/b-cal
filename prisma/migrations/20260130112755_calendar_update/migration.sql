/*
  Warnings:

  - You are about to drop the column `authorId` on the `CalenderEntry` table. All the data in the column will be lost.
  - You are about to drop the column `wholeDay` on the `CalenderEntry` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "CalenderEntry" DROP CONSTRAINT "CalenderEntry_authorId_fkey";

-- AlterTable
ALTER TABLE "CalenderEntry" DROP COLUMN "authorId",
DROP COLUMN "wholeDay",
ADD COLUMN     "userId" TEXT;

-- AddForeignKey
ALTER TABLE "CalenderEntry" ADD CONSTRAINT "CalenderEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
