import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  generateAndPersistWeeklySummary,
  lastCompletedWeek,
  currentWeekToDate,
  WeeklySummaryData,
} from "@/lib/weekly-summary";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const limit = Math.min(parseInt(req.nextUrl.searchParams.get("limit") ?? "12"), 52);

  const summaries = await prisma.weeklySummary.findMany({
    orderBy: { weekStart: "desc" },
    take: limit,
  });

  return NextResponse.json({ data: summaries });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden — admin only" }, { status: 403 });
  }

  // Accept either explicit { weekStart, weekEnd } or { period: "current" | "last" }.
  // Default: last completed week.
  let weekStart: Date;
  let weekEnd: Date;
  try {
    const body = await req.json().catch(() => ({}));
    if (body.weekStart && body.weekEnd) {
      weekStart = new Date(body.weekStart);
      weekEnd = new Date(body.weekEnd);
      if (Number.isNaN(weekStart.getTime()) || Number.isNaN(weekEnd.getTime())) {
        return NextResponse.json({ error: "Invalid dates" }, { status: 400 });
      }
    } else if (body.period === "current") {
      ({ weekStart, weekEnd } = currentWeekToDate());
    } else {
      ({ weekStart, weekEnd } = lastCompletedWeek());
    }
  } catch {
    ({ weekStart, weekEnd } = lastCompletedWeek());
  }

  try {
    const summary = await generateAndPersistWeeklySummary(weekStart, weekEnd);
    const data = summary.data as unknown as WeeklySummaryData;
    return NextResponse.json({
      success: true,
      summary: { ...summary },
      totals: data.totals,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { error: `Failed to generate summary: ${msg}` },
      { status: 500 }
    );
  }
}
