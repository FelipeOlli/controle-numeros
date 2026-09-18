-- Separa "origem" (como o número foi adquirido) de "vínculo" (onde ele roda,
-- pode ser mais de um). Substitui o enum único Provider por NumberOrigin +
-- NumberPlatform[] em PhoneNumber, e por NumberPlatform em ProviderCredential.

-- 1. Enums novos
CREATE TYPE "NumberOrigin" AS ENUM ('CHIP_FISICO', 'META_OFICIAL', 'NUMERO_VIRTUAL', 'IUNGO');
CREATE TYPE "NumberPlatform" AS ENUM ('WHATSAPP_NORMAL', 'WHATSAPP_BUSINESS', 'ZAPI', 'EVOLUTION', 'META_CLOUD');

-- 2. Colunas novas (nullable/default por ora, pra poder fazer backfill)
ALTER TABLE "PhoneNumber" ADD COLUMN "origin" "NumberOrigin";
ALTER TABLE "PhoneNumber" ADD COLUMN "platforms" "NumberPlatform"[] NOT NULL DEFAULT '{}';
ALTER TABLE "ProviderCredential" ADD COLUMN "platform" "NumberPlatform";

-- 3. Backfill de PhoneNumber a partir do provider antigo
UPDATE "PhoneNumber" SET "origin" = 'IUNGO' WHERE "provider" = 'IUNGO';
UPDATE "PhoneNumber" SET "origin" = 'CHIP_FISICO' WHERE "provider" = 'CHIP_FISICO';
UPDATE "PhoneNumber" SET "origin" = 'META_OFICIAL', "platforms" = ARRAY['META_CLOUD']::"NumberPlatform"[] WHERE "provider" = 'META_CLOUD';
UPDATE "PhoneNumber" SET "origin" = 'CHIP_FISICO', "platforms" = ARRAY['EVOLUTION']::"NumberPlatform"[] WHERE "provider" = 'EVOLUTION';
UPDATE "PhoneNumber" SET "origin" = 'CHIP_FISICO', "platforms" = ARRAY['ZAPI']::"NumberPlatform"[] WHERE "provider" = 'ZAPI';

-- 4. Backfill de ProviderCredential (único valor usado até hoje é ZAPI)
UPDATE "ProviderCredential" SET "platform" = 'ZAPI' WHERE "provider" = 'ZAPI';

-- 5. Torna as colunas novas obrigatórias
ALTER TABLE "PhoneNumber" ALTER COLUMN "origin" SET NOT NULL;
ALTER TABLE "ProviderCredential" ALTER COLUMN "platform" SET NOT NULL;

-- 6. Remove as colunas/enum antigos e recria a unique com o novo campo
DROP INDEX "ProviderCredential_orgId_provider_key";
ALTER TABLE "PhoneNumber" DROP COLUMN "provider";
ALTER TABLE "ProviderCredential" DROP COLUMN "provider";
DROP TYPE "Provider";

CREATE UNIQUE INDEX "ProviderCredential_orgId_platform_key" ON "ProviderCredential"("orgId", "platform");
