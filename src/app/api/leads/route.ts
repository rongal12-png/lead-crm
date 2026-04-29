import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { calculateLeadScore } from "@/lib/ai/insights";

const createLeadSchema = z.object({
  displayName: z.string().min(1),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  companyName: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional(),
  country: z.string().optional(),
  source: z.string().optional(),
  leadTypeId: z.string().optional(),
  pipelineId: z.string().optional(),
  stageId: z.string().optional(),
  ownerId: z.string().optional(),
  potentialAmount: z.number().optional(),
  currency: z.string().default("USD"),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).default("MEDIUM"),
  nextFollowUpAt: z.string().optional(),
  tags: z.array(z.string()).optional(),
  note: z.string().optional(),
});

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const isManagerOrAdmin = session.user.role === "ADMIN" || session.user.role === "MANAGER";

  const page = parseInt(searchParams.get("page") ?? "1");
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "25"), 100);
  const skip = (page - 1) * limit;

  const where: Parameters<typeof prisma.lead.findMany>[0]["where"] = {
    status: (searchParams.get("status") as "ACTIVE" | "INACTIVE" | "ARCHIVED" | undefined) ?? "ACTIVE",
  };

  if (!isManagerOrAdmin) {
    where.ownerId = session.user.id;
  } else if (searchParams.get("ownerId")) {
    where.ownerId = searchParams.get("ownerId")!;
  }

  if (searchParams.get("search")) {
    const search = searchParams.get("search")!;
    where.OR = [
      { displayName: { contains: search, mode: "insensitive" } },
      { companyName: { contains: search, mode: "insensitive" } },
      { email: { contains: search, mode: "insensitive" } },
    ];
  }

  if (searchParams.get("leadTypeId")) where.leadTypeId = searchParams.get("leadTypeId")!;
  if (searchParams.get("stageId")) where.stageId = searchParams.get("stageId")!;
  if (searchParams.get("priority")) where.priority = searchParams.get("priority") as "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  if (searchParams.get("minScore")) where.aiScore = { gte: parseInt(searchParams.get("minScore")!) };

  const sortBy = searchParams.get("sortBy") ?? "lastActivityAt";
  const sortOrder = (searchParams.get("sortOrder") ?? "desc") as "asc" | "desc";

  const validSortFields = ["displayName", "potentialAmount", "aiScore", "lastActivityAt", "createdAt", "nextFollowUpAt"];
  const orderField = validSortFields.includes(sortBy) ? sortBy : "lastActivityAt";

  const [total, leads] = await Promise.all([
    prisma.lead.count({ where }),
    prisma.lead.findMany({
      where,
      include: {
        leadType: { select: { id: true, name: true, color: true } },
        owner: { select: { id: true, name: true } },
        stage: { select: { id: true, name: true, color: true } },
      },
      orderBy: { [orderField]: sortOrder },
      skip,
      take: limit,
    }),
  ]);

  return NextResponse.json({ data: leads, total, page, limit, totalPages: Math.ceil(total / limit) });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = createLeadSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid data", details: parsed.error.issues }, { status: 400 });
  }

  const data = parsed.data;
  const ownerId = data.ownerId ?? session.user.id;

  // Auto-assign pipeline/stage from lead type if not provided
  let pipelineId = data.pipelineId;
  let stageId = data.stageId;

  if (!pipelineId && data.leadTypeId) {
    const lt = await prisma.leadType.findUnique({ where: { id: data.leadTypeId } });
    if (lt?.defaultPipelineId) {
      pipelineId = lt.defaultPipelineId;
    }
  }

  if (!stageId && pipelineId) {
    const defaultStage = await prisma.stage.findFirst({
      where: { pipelineId },
      orderBy: { order: "asc" },
    });
    stageId = defaultStage?.id;
  }

  const lead = await prisma.lead.create({
    data: {
      displayName: data.displayName,
      firstName: data.firstName,
      lastName: data.lastName,
      companyName: data.companyName,
      email: data.email || undefined,
      phone: data.phone,
      country: data.country,
      source: data.source,
      leadTypeId: data.leadTypeId,
      pipelineId,
      stageId,
      ownerId,
      createdBy: session.user.id,
      potentialAmount: data.potentialAmount,
      currency: data.currency,
      priority: data.priority,
      nextFollowUpAt: data.nextFollowUpAt ? new Date(data.nextFollowUpAt) : undefined,
      tags: data.tags ?? [],
      lastActivityAt: new Date(),
    },
  });

  // Add creation activity
  await prisma.activity.create({
    data: {
      leadId: lead.id,
      userId: session.user.id,
      type: "LEAD_CREATED",
      title: "Lead created",
      content: data.note,
    },
  });

  // If default stage, record history
  if (stageId) {
    await prisma.stageHistory.create({
      data: { leadId: lead.id, stageId, userId: session.user.id },
    });
  }

  // Calculate initial AI score
  try {
    const score = await calculateLeadScore(lead.id);
    await prisma.lead.update({ where: { id: lead.id }, data: { aiScore: score } });
  } catch {
    // Non-critical
  }

  // Audit log
  await prisma.auditLog.create({
    data: {
      actorUserId: session.user.id,
      entityType: "Lead",
      entityId: lead.id,
      action: "CREATE",
      after: { displayName: lead.displayName },
      ipAddress: req.headers.get("x-forwarded-for") ?? undefined,
    },
  });

  return NextResponse.json({ success: true, data: lead }, { status: 201 });
}
