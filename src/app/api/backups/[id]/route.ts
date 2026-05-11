import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const snapshot = await prisma.backupSnapshot.findUnique({
    where: { id: params.id },
  });
  if (!snapshot) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const fileName = `leados-backup-${snapshot.createdAt.toISOString().replace(/[:.]/g, "-")}.json`;
  return new NextResponse(JSON.stringify(snapshot.data, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="${fileName}"`,
    },
  });
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await prisma.backupSnapshot.delete({ where: { id: params.id } });
  return NextResponse.json({ success: true });
}
