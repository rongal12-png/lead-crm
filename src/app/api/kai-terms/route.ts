import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  DEFAULT_KAI_TERMS_CONTENT,
  DEFAULT_KAI_TERMS_TITLE,
} from "@/lib/kai-terms-default";

const SLUG = "default";

async function getOrCreateDoc() {
  const existing = await prisma.kaiTerms.findUnique({ where: { slug: SLUG } });
  if (existing) return existing;
  return prisma.kaiTerms.create({
    data: {
      slug: SLUG,
      title: DEFAULT_KAI_TERMS_TITLE,
      content: DEFAULT_KAI_TERMS_CONTENT,
    },
  });
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const doc = await getOrCreateDoc();
  return NextResponse.json({ data: doc });
}

export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const title = typeof body.title === "string" ? body.title.trim() : null;
  const content = typeof body.content === "string" ? body.content : null;

  if (content === null || content.length === 0) {
    return NextResponse.json({ error: "Content is required" }, { status: 400 });
  }

  const existing = await getOrCreateDoc();

  const updated = await prisma.kaiTerms.update({
    where: { id: existing.id },
    data: {
      title: title && title.length > 0 ? title : existing.title,
      content,
      version: { increment: 1 },
      updatedById: session.user.id,
    },
  });

  return NextResponse.json({ data: updated });
}
