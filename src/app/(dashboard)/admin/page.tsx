import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import Header from "@/components/layout/Header";
import AdminClient from "@/components/admin/AdminClient";

export default async function AdminPage() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") redirect("/dashboard");

  const [users, leadTypes, pipelines, automationRules, totalLeads, openTasks] = await Promise.all([
    prisma.user.findMany({
      select: {
        id: true, name: true, email: true, role: true, status: true, createdAt: true,
        _count: { select: { ownedLeads: true, assignedTasks: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.leadType.findMany({ orderBy: { name: "asc" } }),
    prisma.pipeline.findMany({
      include: { stages: { orderBy: { order: "asc" } } },
      orderBy: { name: "asc" },
    }),
    prisma.automationRule.findMany({ orderBy: { createdAt: "desc" } }),
    prisma.lead.count({ where: { status: "ACTIVE" } }),
    prisma.task.count({ where: { status: { in: ["OPEN", "IN_PROGRESS"] } } }),
  ]);

  const activeUsers = users.filter((u) => u.status === "active").length;

  return (
    <div>
      <Header title="Back Office" />
      <div className="p-6 page-enter">
        <div className="mb-5">
          <h2 className="text-lg font-bold text-gray-900">System Administration</h2>
          <p className="text-sm text-gray-500 mt-0.5">Manage users, pipelines, and system settings</p>
        </div>
        <AdminClient
          users={JSON.parse(JSON.stringify(users))}
          leadTypes={JSON.parse(JSON.stringify(leadTypes))}
          pipelines={JSON.parse(JSON.stringify(pipelines))}
          automationRules={JSON.parse(JSON.stringify(automationRules))}
          stats={{ totalLeads, activeUsers, openTasks }}
          currentUserId={session.user.id}
        />
      </div>
    </div>
  );
}
