import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const pipelines = await prisma.pipeline.findMany({
    include: {
      stages: { orderBy: { order: "asc" } },
      _count: { select: { leads: true } },
    },
    orderBy: { name: "asc" },
  });

  return NextResponse.json({ data: pipelines });
}

const createPipelineSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = createPipelineSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid data" }, { status: 400 });

  const pipeline = await prisma.pipeline.create({
    data: {
      name: parsed.data.name,
      description: parsed.data.description,
      stages: {
        create: [
          { name: "New", order: 0, probability: 10, color: "#6366f1" },
          { name: "Qualified", order: 1, probability: 30, color: "#3b82f6" },
          { name: "Won", order: 2, probability: 100, color: "#10b981", isWon: true },
        ],
      },
    },
    include: { stages: { orderBy: { order: "asc" } } },
  });

  return NextResponse.json({ success: true, data: pipeline }, { status: 201 });
}
