import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Header from "@/components/layout/Header";
import TasksKanban from "@/components/tasks/TasksKanban";

export const dynamic = "force-dynamic";

export default async function TasksPage() {
  const session = await getServerSession(authOptions);
  if (!session) return null;

  const isAdmin = session.user.role === "ADMIN";

  const [tasks, leads, users] = await Promise.all([
    prisma.task.findMany({
      where: { status: { in: ["OPEN", "IN_PROGRESS", "COMPLETED"] } },
      include: {
        lead: { select: { id: true, displayName: true } },
        assignee: { select: { id: true, name: true } },
      },
      orderBy: [{ dueAt: "asc" }, { priority: "desc" }],
      take: 500,
    }),
    prisma.lead.findMany({
      where: { status: "ACTIVE" },
      select: { id: true, displayName: true, companyName: true },
      orderBy: { lastActivityAt: "desc" },
      take: 500,
    }),
    prisma.user.findMany({
      where: { status: "active" },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <div>
      <Header title="Tasks" />
      <div className="p-6">
        <TasksKanban
          initialTasks={JSON.parse(JSON.stringify(tasks))}
          leads={leads}
          users={users}
          currentUserId={session.user.id}
          isAdmin={isAdmin}
        />
      </div>
    </div>
  );
}
