import { NextRequest, NextResponse } from "next/server";
import {
  generateAndPersistWeeklySummary,
  lastCompletedWeek,
  notifyAdminsOfWeeklySummary,
  WeeklySummaryData,
} from "@/lib/weekly-summary";

export async function POST(req: NextRequest) {
  const expected = process.env.CRON_SECRET;
  if (!expected) {
    return NextResponse.json(
      { error: "CRON_SECRET is not configured on the server" },
      { status: 500 }
    );
  }

  const auth = req.headers.get("authorization") ?? "";
  const provided = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";
  if (provided !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { weekStart, weekEnd } = lastCompletedWeek();

  try {
    const summary = await generateAndPersistWeeklySummary(weekStart, weekEnd);
    const data = summary.data as unknown as WeeklySummaryData;
    await notifyAdminsOfWeeklySummary(summary.id, weekStart, weekEnd, data.totals);

    return NextResponse.json({
      success: true,
      summaryId: summary.id,
      weekStart,
      weekEnd,
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
