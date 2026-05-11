import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type RestorePayload =
  | { kind: "lead"; id: string }
  | { kind: "task"; id: string }
  | { kind: "user"; id: string };

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = (await req.json().catch(() => null)) as RestorePayload | null;
  if (!body?.kind || !body.id) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  if (body.kind === "lead") {
    const lead = await prisma.lead.findUnique({ where: { id: body.id } });
    if (!lead) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (lead.status !== "ARCHIVED") {
      return NextResponse.json({ error: "Lead is not archived" }, { status: 400 });
    }
    await prisma.lead.update({
      where: { id: body.id },
      data: { status: "ACTIVE" },
    });
    await prisma.auditLog.create({
      data: {
        actorUserId: session.user.id,
        entityType: "Lead",
        entityId: body.id,
        action: "RESTORE",
        before: { status: "ARCHIVED" },
        after: { status: "ACTIVE" },
      },
    });
    return NextResponse.json({ success: true });
  }

  if (body.kind === "task") {
    const task = await prisma.task.findUnique({ where: { id: body.id } });
    if (!task) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (task.status !== "CANCELLED") {
      return NextResponse.json({ error: "Task is not cancelled" }, { status: 400 });
    }
    await prisma.task.update({
      where: { id: body.id },
      data: { status: "OPEN" },
    });
    await prisma.auditLog.create({
      data: {
        actorUserId: session.user.id,
        entityType: "Task",
        entityId: body.id,
        action: "RESTORE",
        before: { status: "CANCELLED" },
        after: { status: "OPEN" },
      },
    });
    return NextResponse.json({ success: true });
  }

  if (body.kind === "user") {
    const user = await prisma.user.findUnique({ where: { id: body.id } });
    if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (user.status !== "inactive") {
      return NextResponse.json({ error: "User is not inactive" }, { status: 400 });
    }
    await prisma.user.update({
      where: { id: body.id },
      data: { status: "active" },
    });
    await prisma.auditLog.create({
      data: {
        actorUserId: session.user.id,
        entityType: "User",
        entityId: body.id,
        action: "RESTORE",
        before: { status: "inactive" },
        after: { status: "active" },
      },
    });
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: "Unknown kind" }, { status: 400 });
}
