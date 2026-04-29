import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateLeadSummary } from "@/lib/ai/insights";

export async function POST(req: NextRequest, { params }: { params: { leadId: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const summary = await generateLeadSummary(params.leadId);

  await prisma.lead.update({
    where: { id: params.leadId },
    data: { aiSummary: summary },
  });

  await prisma.activity.create({
    data: {
      leadId: params.leadId,
      userId: session.user.id,
      type: "AI_SUMMARY",
      title: "AI Summary generated",
      content: summary,
    },
  });

  return NextResponse.json({ success: true, data: { summary } });
}
