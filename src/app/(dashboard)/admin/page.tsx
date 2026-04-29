import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import Header from "@/components/layout/Header";
import AdminClient from "@/components/admin/AdminClient";

export default async function AdminPage() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") redirect("/dashboard");

  const [users, leadTypes, pipelines, automationRules] = await Promise.all([
    prisma.user.findMany({
      select: { id: true, name: true, email: true, role: true, status: true, createdAt: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.leadType.findMany({ orderBy: { name: "asc" } }),
    prisma.pipeline.findMany({
      include: { stages: { orderBy: { order: "asc" }, take: 20 } },
      orderBy: { name: "asc" },
    }),
    prisma.automationRule.findMany({ orderBy: { createdAt: "desc" } }),
  ]);

  return (
    <div>
      <Header title="Admin Settings" />
      <div className="p-6">
        <AdminClient
          users={JSON.parse(JSON.stringify(users))}
          leadTypes={JSON.parse(JSON.stringify(leadTypes))}
          pipelines={JSON.parse(JSON.stringify(pipelines))}
          automationRules={JSON.parse(JSON.stringify(automationRules))}
        />
      </div>
    </div>
  );
}
