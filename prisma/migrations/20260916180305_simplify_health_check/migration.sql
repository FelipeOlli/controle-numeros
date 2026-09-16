/*
  Warnings:

  - You are about to drop the column `qualityRating` on the `HealthCheck` table. All the data in the column will be lost.
  - You are about to drop the column `warningsCount` on the `HealthCheck` table. All the data in the column will be lost.

*/
-- AlterEnum
ALTER TYPE "HealthStatus" ADD VALUE 'LOST';

-- AlterTable
ALTER TABLE "HealthCheck" DROP COLUMN "qualityRating",
DROP COLUMN "warningsCount";
