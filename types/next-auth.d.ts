import type { Role } from "@/generated/prisma/enums";

declare module "next-auth" {
  interface Membership {
    orgId: string;
    orgSlug: string;
    orgName: string;
    role: Role;
  }

  interface Session {
    user: {
      id: string;
      email?: string | null;
      name?: string | null;
    };
    memberships: Membership[];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    userId?: string;
  }
}
