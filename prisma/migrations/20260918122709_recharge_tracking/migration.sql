-- Acompanhamento de recarga pra números com chip físico.

CREATE TYPE "Carrier" AS ENUM ('TIM', 'VIVO', 'CLARO', 'OI', 'OUTRA');

ALTER TABLE "PhoneNumber" ADD COLUMN "carrier" "Carrier";
ALTER TABLE "PhoneNumber" ADD COLUMN "lastRechargeAt" TIMESTAMP(3);
ALTER TABLE "PhoneNumber" ADD COLUMN "nextRechargeAt" TIMESTAMP(3);
ALTER TABLE "PhoneNumber" ADD COLUMN "rechargeReminderSentAt" TIMESTAMP(3);
