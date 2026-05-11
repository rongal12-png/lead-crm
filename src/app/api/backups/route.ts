import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createBackupSnapshot } from "@/lib/backup";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const snapshots = await prisma.backupSnapshot.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      createdAt: true,
      triggeredBy: true,
      triggeredById: true,
      entityCounts: true,
      sizeBytes: true,
    },
  });

  return NextResponse.json({ data: snapshots });
}

export async function POST(_req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const result = await createBackupSnapshot({
      triggeredBy: "manual",
      triggeredById: session.user.id,
    });
    return NextResponse.json({ success: true, ...result });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: `Backup failed: ${msg}` }, { status: 500 });
  }
}
