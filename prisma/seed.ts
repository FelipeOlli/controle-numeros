import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaClient } from "../generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  const org = await prisma.organization.upsert({
    where: { slug: "empresa-exemplo" },
    update: {},
    create: { name: "Empresa Exemplo", slug: "empresa-exemplo" },
  });

  const email = process.env.SEED_ADMIN_EMAIL ?? "felipeoliveiravl@gmail.com";
  const password = process.env.SEED_ADMIN_PASSWORD ?? "mude-esta-senha";

  const user = await prisma.user.upsert({
    where: { email },
    update: {},
    create: {
      email,
      name: "Felipe",
      passwordHash: await bcrypt.hash(password, 10),
    },
  });

  await prisma.membership.upsert({
    where: { userId_orgId: { userId: user.id, orgId: org.id } },
    update: { role: "OWNER" },
    create: { userId: user.id, orgId: org.id, role: "OWNER" },
  });

  const samples = [
    { label: "Iungo - Vendas 1", e164: "+5511900000001", provider: "IUNGO" as const },
    { label: "Chip físico - Suporte", e164: "+5511900000002", provider: "CHIP_FISICO" as const },
    { label: "Meta Cloud - Institucional", e164: "+5511900000003", provider: "META_CLOUD" as const },
    { label: "Evolution - Disparo 1", e164: "+5511900000004", provider: "EVOLUTION" as const },
    { label: "Z-API - Disparo 2", e164: "+5511900000005", provider: "ZAPI" as const },
  ];

  for (const s of samples) {
    await prisma.phoneNumber.upsert({
      where: { orgId_e164: { orgId: org.id, e164: s.e164 } },
      update: {},
      create: { ...s, orgId: org.id, currentStatus: "UNKNOWN" },
    });
  }

  console.log(`Seed ok. Login: ${email} / senha: ${password}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
