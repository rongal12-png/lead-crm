import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Header from "@/components/layout/Header";
import TasksClient from "@/components/tasks/TasksClient";

export default async function TasksPage() {
  const session = await getServerSession(authOptions);
  if (!session) return null;

  const isAdmin = session.user.role === "ADMIN";

  const tasks = await prisma.task.findMany({
    where: {
      ...(isAdmin ? {} : { assignedTo: session.user.id }),
      status: { in: ["OPEN", "IN_PROGRESS"] },
    },
    include: {
      lead: { select: { id: true, displayName: true } },
      assignee: { select: { id: true, name: true } },
    },
    orderBy: [{ dueAt: "asc" }, { priority: "desc" }],
    take: 200,
  });

  return (
    <div>
      <Header title="Tasks" />
      <div className="p-6">
        <TasksClient
          initialTasks={JSON.parse(JSON.stringify(tasks))}
          currentUserId={session.user.id}
        />
      </div>
    </div>
  );
}
