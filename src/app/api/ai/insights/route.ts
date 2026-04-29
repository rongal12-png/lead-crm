import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { runInsightsJob } from "@/lib/ai/insights";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const leadId = searchParams.get("leadId");
  const isManagerOrAdmin = session.user.role === "ADMIN" || session.user.role === "MANAGER";

  const insights = await prisma.aIInsight.findMany({
    where: {
      status: "ACTIVE",
      ...(leadId ? { leadId } : {}),
      ...(isManagerOrAdmin ? {} : { userId: session.user.id }),
    },
    include: { lead: { select: { id: true, displayName: true } } },
    orderBy: [{ severity: "desc" }, { createdAt: "desc" }],
    take: 20,
  });

  return NextResponse.json({ data: insights });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { action, insightId } = body;

  if (action === "dismiss" && insightId) {
    await prisma.aIInsight.update({
      where: { id: insightId },
      data: { status: "DISMISSED", dismissedAt: new Date() },
    });
    return NextResponse.json({ success: true });
  }

  if (action === "run_job" && (session.user.role === "ADMIN" || session.user.role === "MANAGER")) {
    const count = await runInsightsJob();
    return NextResponse.json({ success: true, data: { insightsCreated: count } });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
