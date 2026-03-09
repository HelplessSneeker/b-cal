-- AlterTable
ALTER TABLE "UserPreferences" ADD COLUMN     "accentColor" TEXT NOT NULL DEFAULT 'blue',
ADD COLUMN     "density" TEXT NOT NULL DEFAULT 'default',
ADD COLUMN     "theme" TEXT NOT NULL DEFAULT 'system',
ADD COLUMN     "weekStart" TEXT NOT NULL DEFAULT 'monday';
