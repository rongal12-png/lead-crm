import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const lead = await prisma.lead.findUnique({
    where: { id: params.id },
    include: {
      leadType: true,
      owner: { select: { id: true, name: true, email: true, image: true } },
      creator: { select: { id: true, name: true } },
      stage: true,
      pipeline: true,
      activities: {
        include: { user: { select: { id: true, name: true, image: true } } },
        orderBy: { occurredAt: "desc" },
        take: 50,
      },
      tasks: {
        include: {
          assignee: { select: { id: true, name: true, image: true } },
          lead: { select: { id: true, displayName: true } },
        },
        orderBy: [{ status: "asc" }, { dueAt: "asc" }],
      },
      aiInsights: {
        where: { status: "ACTIVE" },
        orderBy: { createdAt: "desc" },
        take: 5,
      },
      customValues: {
        include: { fieldDefinition: true },
      },
    },
  });

  if (!lead) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({ data: lead });
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const lead = await prisma.lead.findUnique({ where: { id: params.id } });
  if (!lead) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const isAdmin = session.user.role === "ADMIN";

  const body = await req.json();
  const {
    displayName, firstName, lastName, companyName, email, phone, country,
    source, leadTypeId, pipelineId, stageId, ownerId, priority, status,
    potentialAmount, committedAmount, closedAmount, currency,
    probability, nextFollowUpAt, tags, aiSummary, manualScore,
  } = body;

  const before = { ...lead };

  const updated = await prisma.lead.update({
    where: { id: params.id },
    data: {
      ...(displayName !== undefined && { displayName }),
      ...(firstName !== undefined && { firstName }),
      ...(lastName !== undefined && { lastName }),
      ...(companyName !== undefined && { companyName }),
      ...(email !== undefined && { email: email || null }),
      ...(phone !== undefined && { phone }),
      ...(country !== undefined && { country }),
      ...(source !== undefined && { source }),
      ...(leadTypeId !== undefined && { leadTypeId }),
      ...(pipelineId !== undefined && { pipelineId }),
      ...(stageId !== undefined && { stageId }),
      ...(ownerId !== undefined && isAdmin && { ownerId }),
      ...(priority !== undefined && { priority }),
      ...(status !== undefined && { status }),
      ...(potentialAmount !== undefined && { potentialAmount }),
      ...(committedAmount !== undefined && { committedAmount }),
      ...(closedAmount !== undefined && { closedAmount }),
      ...(currency !== undefined && { currency }),
      ...(probability !== undefined && { probability }),
      ...(nextFollowUpAt !== undefined && { nextFollowUpAt: nextFollowUpAt ? new Date(nextFollowUpAt) : null }),
      ...(tags !== undefined && { tags }),
      ...(aiSummary !== undefined && { aiSummary }),
      ...(manualScore !== undefined && { manualScore }),
      lastActivityAt: new Date(),
    },
    include: {
      leadType: true,
      stage: true,
      owner: { select: { id: true, name: true } },
    },
  });

  await prisma.auditLog.create({
    data: {
      actorUserId: session.user.id,
      entityType: "Lead",
      entityId: params.id,
      action: "UPDATE",
      before,
      after: body,
    },
  });

  return NextResponse.json({ success: true, data: updated });
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const lead = await prisma.lead.findUnique({ where: { id: params.id } });
  if (!lead) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.lead.update({ where: { id: params.id }, data: { status: "ARCHIVED" } });

  await prisma.auditLog.create({
    data: {
      actorUserId: session.user.id,
      entityType: "Lead",
      entityId: params.id,
      action: "ARCHIVE",
      before: { status: lead.status },
      after: { status: "ARCHIVED" },
    },
  });

  return NextResponse.json({ success: true });
}
