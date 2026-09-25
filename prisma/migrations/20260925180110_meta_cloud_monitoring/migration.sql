-- CreateEnum
CREATE TYPE "MetaQualityRating" AS ENUM ('GREEN', 'YELLOW', 'RED', 'UNKNOWN');

-- AlterTable
ALTER TABLE "PhoneNumber" ADD COLUMN     "monthlySpend" DECIMAL(10,2),
ADD COLUMN     "qualityRating" "MetaQualityRating",
ADD COLUMN     "spendCurrency" TEXT,
ADD COLUMN     "spendMonth" TEXT,
ALTER COLUMN "platforms" DROP DEFAULT;
