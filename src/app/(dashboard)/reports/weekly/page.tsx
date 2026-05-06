import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Header from "@/components/layout/Header";
import WeeklySummaryView from "@/components/reports/WeeklySummaryView";
import type { WeeklySummaryData } from "@/lib/weekly-summary";

export const dynamic = "force-dynamic";

export default async function WeeklyReportsPage() {
  const session = await getServerSession(authOptions);
  if (!session) return null;

  const isAdmin = session.user.role === "ADMIN";

  const rows = await prisma.weeklySummary.findMany({
    orderBy: { weekStart: "desc" },
    take: 12,
  });

  const summaries = rows.map((r) => ({
    id: r.id,
    weekStart: r.weekStart.toISOString(),
    weekEnd: r.weekEnd.toISOString(),
    generatedAt: r.generatedAt.toISOString(),
    data: r.data as unknown as WeeklySummaryData,
    narrative: r.narrative,
  }));

  return (
    <div>
      <Header title="Weekly Summary" />
      <div className="p-6">
        <WeeklySummaryView initialSummaries={summaries} isAdmin={isAdmin} />
      </div>
    </div>
  );
}
