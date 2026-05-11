import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import Header from "@/components/layout/Header";
import BackupsClient from "@/components/admin/BackupsClient";

export const dynamic = "force-dynamic";

export default async function BackupsPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");
  if (session.user.role !== "ADMIN") redirect("/dashboard");

  return (
    <div>
      <Header title="Backups" />
      <div className="p-6">
        <BackupsClient />
      </div>
    </div>
  );
}
