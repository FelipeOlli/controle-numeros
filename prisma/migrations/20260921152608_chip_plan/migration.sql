-- Distingue chip físico pré-pago (recarrega) de conta/plano (faturado, não recarrega).

CREATE TYPE "ChipPlan" AS ENUM ('PRE_PAGO', 'POS_PAGO');

ALTER TABLE "PhoneNumber" ADD COLUMN "chipPlan" "ChipPlan";

-- Chips físicos já cadastrados seguem o comportamento que já tinham: recarga.
UPDATE "PhoneNumber" SET "chipPlan" = 'PRE_PAGO' WHERE "origin" = 'CHIP_FISICO';
