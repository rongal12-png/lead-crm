import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const me = session.user.id;
  const participants = await prisma.conversationParticipant.findMany({
    where: { userId: me },
    select: { conversationId: true, lastReadAt: true },
  });

  if (participants.length === 0) {
    return NextResponse.json({ data: { totalUnread: 0 } });
  }

  let total = 0;
  for (const p of participants) {
    const count = await prisma.message.count({
      where: {
        conversationId: p.conversationId,
        senderId: { not: me },
        createdAt: { gt: p.lastReadAt },
      },
    });
    total += count;
  }

  return NextResponse.json({ data: { totalUnread: total } });
}
