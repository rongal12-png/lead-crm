import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const me = session.user.id;

  const participantsOfMe = await prisma.conversationParticipant.findMany({
    where: { userId: me },
    select: { conversationId: true, lastReadAt: true },
  });
  const conversationIds = participantsOfMe.map((p) => p.conversationId);
  const myLastRead = new Map(participantsOfMe.map((p) => [p.conversationId, p.lastReadAt]));

  if (conversationIds.length === 0) {
    return NextResponse.json({ data: [] });
  }

  const conversations = await prisma.conversation.findMany({
    where: { id: { in: conversationIds } },
    include: {
      participants: {
        include: { user: { select: { id: true, name: true, email: true } } },
      },
      messages: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { id: true, content: true, createdAt: true, senderId: true },
      },
    },
    orderBy: { updatedAt: "desc" },
  });

  const enriched = await Promise.all(
    conversations.map(async (c) => {
      const lastRead = myLastRead.get(c.id) ?? new Date(0);
      const unreadCount = await prisma.message.count({
        where: {
          conversationId: c.id,
          senderId: { not: me },
          createdAt: { gt: lastRead },
        },
      });
      const otherParticipants = c.participants
        .filter((p) => p.userId !== me)
        .map((p) => ({ id: p.user.id, name: p.user.name, email: p.user.email }));
      return {
        id: c.id,
        updatedAt: c.updatedAt.toISOString(),
        otherParticipants,
        unreadCount,
        lastMessage: c.messages[0]
          ? {
              id: c.messages[0].id,
              content: c.messages[0].content,
              createdAt: c.messages[0].createdAt.toISOString(),
              senderId: c.messages[0].senderId,
              fromMe: c.messages[0].senderId === me,
            }
          : null,
      };
    })
  );

  return NextResponse.json({ data: enriched });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const otherUserId = body?.userId as string | undefined;
  if (!otherUserId) {
    return NextResponse.json({ error: "userId required" }, { status: 400 });
  }
  if (otherUserId === session.user.id) {
    return NextResponse.json({ error: "Cannot start a conversation with yourself" }, { status: 400 });
  }

  const other = await prisma.user.findUnique({
    where: { id: otherUserId },
    select: { id: true, status: true },
  });
  if (!other || other.status !== "active") {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const existing = await prisma.conversation.findFirst({
    where: {
      AND: [
        { participants: { some: { userId: session.user.id } } },
        { participants: { some: { userId: otherUserId } } },
      ],
    },
  });

  if (existing) {
    return NextResponse.json({ data: { id: existing.id, isNew: false } });
  }

  const created = await prisma.conversation.create({
    data: {
      participants: {
        create: [{ userId: session.user.id }, { userId: otherUserId }],
      },
    },
  });

  return NextResponse.json({ data: { id: created.id, isNew: true } });
}
