import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { type = "NOTE", title, content, occurredAt } = body;

  const activity = await prisma.activity.create({
    data: {
      leadId: params.id,
      userId: session.user.id,
      type,
      title,
      content,
      occurredAt: occurredAt ? new Date(occurredAt) : new Date(),
    },
    include: { user: { select: { id: true, name: true, image: true } } },
  });

  await prisma.lead.update({
    where: { id: params.id },
    data: { lastActivityAt: new Date() },
  });

  return NextResponse.json({ success: true, data: activity }, { status: 201 });
}
