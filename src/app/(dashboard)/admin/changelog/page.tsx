import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import Header from "@/components/layout/Header";
import ChangelogView from "@/components/admin/ChangelogView";

export const dynamic = "force-dynamic";

export default async function ChangelogPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");
  if (session.user.role !== "ADMIN") redirect("/dashboard");

  return (
    <div>
      <Header title="Version Log" />
      <div className="p-6">
        <ChangelogView />
      </div>
    </div>
  );
}
