import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const [archivedLeads, cancelledTasks, inactiveUsers] = await Promise.all([
    prisma.lead.findMany({
      where: { status: "ARCHIVED" },
      orderBy: { updatedAt: "desc" },
      take: 200,
      select: {
        id: true,
        displayName: true,
        companyName: true,
        email: true,
        phone: true,
        potentialAmount: true,
        currency: true,
        updatedAt: true,
        createdAt: true,
        owner: { select: { id: true, name: true } },
        leadType: { select: { name: true } },
      },
    }),
    prisma.task.findMany({
      where: { status: "CANCELLED" },
      orderBy: { updatedAt: "desc" },
      take: 200,
      select: {
        id: true,
        title: true,
        type: true,
        dueAt: true,
        updatedAt: true,
        lead: { select: { id: true, displayName: true } },
        assignee: { select: { id: true, name: true } },
      },
    }),
    prisma.user.findMany({
      where: { status: "inactive" },
      orderBy: { updatedAt: "desc" },
      take: 200,
      select: { id: true, name: true, email: true, role: true, updatedAt: true },
    }),
  ]);

  return NextResponse.json({
    data: { archivedLeads, cancelledTasks, inactiveUsers },
  });
}
