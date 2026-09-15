import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

export default async function Home() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  const first = session.memberships[0];
  if (!first) {
    redirect("/sem-organizacao");
  }

  redirect(`/${first.orgSlug}/numeros`);
}
