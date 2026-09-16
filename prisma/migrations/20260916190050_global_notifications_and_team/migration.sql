/*
  Warnings:

  - You are about to drop the column `orgId` on the `AlertChannel` table. All the data in the column will be lost.
  - You are about to drop the column `orgId` on the `AlertLog` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "AlertChannel" DROP CONSTRAINT "AlertChannel_orgId_fkey";

-- DropForeignKey
ALTER TABLE "AlertLog" DROP CONSTRAINT "AlertLog_orgId_fkey";

-- DropIndex
DROP INDEX "AlertChannel_orgId_idx";

-- DropIndex
DROP INDEX "AlertLog_orgId_createdAt_idx";

-- AlterTable
ALTER TABLE "AlertChannel" DROP COLUMN "orgId";

-- AlterTable
ALTER TABLE "AlertLog" DROP COLUMN "orgId",
ADD COLUMN     "orgIdAtDispatch" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "notifyEmail" TEXT,
ADD COLUMN     "notifyEnabled" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "AlertLog_createdAt_idx" ON "AlertLog"("createdAt");
