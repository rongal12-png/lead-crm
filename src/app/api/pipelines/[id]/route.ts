import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional().nullable(),
  isDefault: z.boolean().optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid data" }, { status: 400 });

  if (parsed.data.isDefault) {
    await prisma.pipeline.updateMany({
      where: { id: { not: params.id } },
      data: { isDefault: false },
    });
  }

  const pipeline = await prisma.pipeline.update({
    where: { id: params.id },
    data: parsed.data,
    include: { stages: { orderBy: { order: "asc" } } },
  });

  return NextResponse.json({ success: true, data: pipeline });
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const leadsCount = await prisma.lead.count({ where: { pipelineId: params.id } });
  if (leadsCount > 0) {
    return NextResponse.json(
      { error: `Pipeline has ${leadsCount} lead(s). Reassign them before deleting.` },
      { status: 400 }
    );
  }

  await prisma.pipeline.delete({ where: { id: params.id } });
  return NextResponse.json({ success: true });
}
