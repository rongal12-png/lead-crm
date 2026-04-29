import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

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
