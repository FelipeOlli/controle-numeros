-- Data da última sincronização Z-API, por número e por credencial (empresa).

ALTER TABLE "PhoneNumber" ADD COLUMN "lastSyncAt" TIMESTAMP(3);
ALTER TABLE "ProviderCredential" ADD COLUMN "lastSyncAt" TIMESTAMP(3);
