import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  color: z.string().optional(),
  probability: z.number().min(0).max(100).optional(),
  order: z.number().int().min(0).optional(),
  isWon: z.boolean().optional(),
  isLost: z.boolean().optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid data" }, { status: 400 });

  const stage = await prisma.stage.update({
    where: { id: params.id },
    data: parsed.data,
  });

  return NextResponse.json({ success: true, data: stage });
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const leadsCount = await prisma.lead.count({ where: { stageId: params.id } });
  if (leadsCount > 0) {
    return NextResponse.json(
      { error: `Stage has ${leadsCount} lead(s). Move them to another stage first.` },
      { status: 400 }
    );
  }

  await prisma.stage.delete({ where: { id: params.id } });
  return NextResponse.json({ success: true });
}
