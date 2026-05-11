import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import Header from "@/components/layout/Header";
import TrashClient from "@/components/trash/TrashClient";

export const dynamic = "force-dynamic";

export default async function TrashPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");
  if (session.user.role !== "ADMIN") redirect("/dashboard");

  return (
    <div>
      <Header title="Trash / Restore" />
      <div className="p-6">
        <TrashClient />
      </div>
    </div>
  );
}
