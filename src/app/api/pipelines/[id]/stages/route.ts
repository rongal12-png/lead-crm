import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const createStageSchema = z.object({
  name: z.string().min(1),
  color: z.string().optional(),
  probability: z.number().min(0).max(100).optional(),
  isWon: z.boolean().optional(),
  isLost: z.boolean().optional(),
});

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = createStageSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid data" }, { status: 400 });

  const last = await prisma.stage.findFirst({
    where: { pipelineId: params.id },
    orderBy: { order: "desc" },
  });
  const order = (last?.order ?? -1) + 1;

  const stage = await prisma.stage.create({
    data: {
      pipelineId: params.id,
      name: parsed.data.name,
      color: parsed.data.color ?? "#6366f1",
      probability: parsed.data.probability ?? 0,
      isWon: parsed.data.isWon ?? false,
      isLost: parsed.data.isLost ?? false,
      order,
    },
  });

  return NextResponse.json({ success: true, data: stage }, { status: 201 });
}
