-- AlterTable
ALTER TABLE "AlertLog" ADD COLUMN     "notifiedUserId" TEXT,
ALTER COLUMN "channelId" DROP NOT NULL;
