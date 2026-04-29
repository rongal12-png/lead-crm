import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { status, title, description, dueAt, priority, complete } = body;

  const updates: Record<string, unknown> = {};
  if (title !== undefined) updates.title = title;
  if (description !== undefined) updates.description = description;
  if (priority !== undefined) updates.priority = priority;
  if (dueAt !== undefined) updates.dueAt = dueAt ? new Date(dueAt) : null;

  if (complete === true || status === "COMPLETED") {
    updates.status = "COMPLETED";
    updates.completedAt = new Date();
  } else if (status !== undefined) {
    updates.status = status;
  }

  const task = await prisma.task.update({
    where: { id: params.id },
    data: updates,
    include: {
      lead: { select: { id: true, displayName: true } },
      assignee: { select: { id: true, name: true } },
    },
  });

  if (task.status === "COMPLETED" && task.leadId) {
    await prisma.activity.create({
      data: {
        leadId: task.leadId,
        userId: session.user.id,
        type: "TASK_COMPLETED",
        title: `Task completed: ${task.title}`,
      },
    });
    await prisma.lead.update({
      where: { id: task.leadId },
      data: { lastActivityAt: new Date() },
    });
  }

  return NextResponse.json({ success: true, data: task });
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await prisma.task.update({
    where: { id: params.id },
    data: { status: "CANCELLED" },
  });

  return NextResponse.json({ success: true });
}
