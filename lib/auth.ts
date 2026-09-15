import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  // Atrás do proxy do EasyPanel o host não é verificável estaticamente;
  // NEXTAUTH_URL já fixa a origem esperada, então confiar no host aqui é seguro.
  trustHost: true,
  providers: [
    Credentials({
      credentials: {
        email: { label: "E-mail", type: "email" },
        password: { label: "Senha", type: "password" },
      },
      authorize: async (credentials) => {
        const email = credentials?.email as string | undefined;
        const password = credentials?.password as string | undefined;
        if (!email || !password) return null;

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) return null;

        const valid = await bcrypt.compare(password, user.passwordHash);
        if (!valid) return null;

        return { id: user.id, email: user.email, name: user.name ?? undefined };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.userId = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.userId) {
        session.user.id = token.userId as string;

        const memberships = await prisma.membership.findMany({
          where: { userId: token.userId as string },
          include: { org: { select: { id: true, name: true, slug: true } } },
        });

        session.memberships = memberships.map((m) => ({
          orgId: m.orgId,
          orgSlug: m.org.slug,
          orgName: m.org.name,
          role: m.role,
        }));
      }
      return session;
    },
  },
});
