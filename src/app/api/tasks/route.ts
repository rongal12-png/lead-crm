import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const isAdmin = session.user.role === "ADMIN";

  const overdue = searchParams.get("overdue") === "true";
  const status = searchParams.get("status");

  const where: Parameters<typeof prisma.task.findMany>[0]["where"] = {
    ...(isAdmin ? {} : { assignedTo: session.user.id }),
    ...(status ? { status: status as "OPEN" } : { status: { in: ["OPEN", "IN_PROGRESS"] } }),
    ...(overdue ? { dueAt: { lt: new Date() } } : {}),
  };

  const tasks = await prisma.task.findMany({
    where,
    include: {
      lead: { select: { id: true, displayName: true } },
      assignee: { select: { id: true, name: true, image: true } },
    },
    orderBy: [{ dueAt: "asc" }, { priority: "desc" }],
    take: 100,
  });

  return NextResponse.json({ data: tasks });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { leadId, title, description, type = "OTHER", priority = "NORMAL", dueAt, assignedTo } = body;

  if (!title) return NextResponse.json({ error: "title required" }, { status: 400 });

  const task = await prisma.task.create({
    data: {
      leadId: leadId || undefined,
      assignedTo: assignedTo ?? session.user.id,
      createdBy: session.user.id,
      title,
      description,
      type,
      priority,
      dueAt: dueAt ? new Date(dueAt) : undefined,
    },
    include: {
      lead: { select: { id: true, displayName: true } },
      assignee: { select: { id: true, name: true } },
    },
  });

  if (leadId) {
    await prisma.activity.create({
      data: {
        leadId,
        userId: session.user.id,
        type: "TASK_CREATED",
        title: `Task created: ${title}`,
      },
    });
  }

  return NextResponse.json({ success: true, data: task }, { status: 201 });
}
