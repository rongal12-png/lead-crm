import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import type { WeeklySummaryData } from "@/lib/weekly-summary";
import { parseNarrative, type NarrativeLang } from "@/lib/ai/weekly-narrative";
import WeeklyReportPrintView from "@/components/reports/WeeklyReportPrintView";

export const dynamic = "force-dynamic";

export default async function WeeklyPrintPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { lang?: string };
}) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const row = await prisma.weeklySummary.findUnique({ where: { id: params.id } });
  if (!row) notFound();

  const langParam = searchParams.lang === "he" || searchParams.lang === "en" ? searchParams.lang : "he";
  const lang: NarrativeLang = langParam;

  const narrative = parseNarrative(row.narrative);

  return (
    <WeeklyReportPrintView
      summary={{
        id: row.id,
        weekStart: row.weekStart.toISOString(),
        weekEnd: row.weekEnd.toISOString(),
        generatedAt: row.generatedAt.toISOString(),
        data: row.data as unknown as WeeklySummaryData,
      }}
      narrative={narrative}
      lang={lang}
    />
  );
}
