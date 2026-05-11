/*
  Read-only DB audit script — looks for evidence of recently-deleted or
  recently-overwritten data so we can decide whether recovery is possible.
  Run: npx ts-node scripts/audit-recovery.ts
*/
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function fmt(d: Date | null | undefined): string {
  return d ? new Date(d).toISOString().replace("T", " ").slice(0, 19) : "—";
}

async function main() {
  const since = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);

  console.log("=".repeat(70));
  console.log(" DB AUDIT — recovery scan");
  console.log(" Looking back to:", fmt(since));
  console.log("=".repeat(70));

  // 1. Lead counts by status
  const statusCounts = await prisma.lead.groupBy({
    by: ["status"],
    _count: true,
  });
  console.log("\n[1] LEAD COUNTS BY STATUS");
  for (const r of statusCounts) {
    console.log(`    ${r.status.padEnd(10)} ${r._count}`);
  }

  // 2. Archived leads (= soft-deleted), most recently touched first
  const archived = await prisma.lead.findMany({
    where: { status: "ARCHIVED" },
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      displayName: true,
      companyName: true,
      email: true,
      phone: true,
      potentialAmount: true,
      createdAt: true,
      updatedAt: true,
      createdBy: true,
      ownerId: true,
      creator: { select: { name: true, email: true } },
      owner: { select: { name: true, email: true } },
    },
    take: 50,
  });
  console.log(`\n[2] ARCHIVED LEADS (soft-deleted) — ${archived.length} shown`);
  if (archived.length === 0) {
    console.log("    (none)");
  } else {
    for (const l of archived) {
      console.log(
        `    ${fmt(l.updatedAt)}  ${l.displayName}` +
          (l.companyName ? ` (${l.companyName})` : "") +
          `  creator=${l.creator?.name ?? "?"} owner=${l.owner?.name ?? "?"} id=${l.id}`
      );
    }
  }

  // 3. AuditLog — every lead-related event in window
  const audits = await prisma.auditLog.findMany({
    where: { entityType: "Lead", createdAt: { gte: since } },
    orderBy: { createdAt: "desc" },
    take: 200,
    include: { actor: { select: { name: true, email: true } } },
  });
  console.log(`\n[3] AUDITLOG — Lead events in last 14 days (${audits.length})`);
  if (audits.length === 0) {
    console.log("    (no audit log entries — actions before audit was added are NOT recoverable from this table)");
  } else {
    const byAction: Record<string, number> = {};
    for (const a of audits) byAction[a.action] = (byAction[a.action] ?? 0) + 1;
    for (const [k, v] of Object.entries(byAction)) console.log(`    action=${k.padEnd(10)} ${v}`);
    console.log("\n    Recent rows:");
    for (const a of audits.slice(0, 20)) {
      console.log(
        `    ${fmt(a.createdAt)}  ${a.action.padEnd(8)}  by=${a.actor?.name ?? "?"}  leadId=${a.entityId}`
      );
    }
  }

  // 4. All recent lead activity (creates + updates) — sanity check
  const recentCreates = await prisma.lead.findMany({
    where: { createdAt: { gte: since } },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      displayName: true,
      status: true,
      createdAt: true,
      updatedAt: true,
      creator: { select: { name: true, email: true } },
    },
    take: 100,
  });
  console.log(`\n[4] LEADS CREATED IN LAST 14 DAYS (${recentCreates.length})`);
  for (const l of recentCreates) {
    console.log(
      `    ${fmt(l.createdAt)} -> upd ${fmt(l.updatedAt)}  status=${l.status.padEnd(8)} ` +
        `creator=${l.creator?.name ?? "?"}  ${l.displayName}  id=${l.id}`
    );
  }

  // 5. Users — could one of them have been removed?
  const users = await prisma.user.findMany({
    select: { id: true, name: true, email: true, role: true, status: true, createdAt: true },
    orderBy: { createdAt: "desc" },
  });
  console.log(`\n[5] USERS IN SYSTEM (${users.length})`);
  for (const u of users) {
    console.log(`    ${u.email.padEnd(30)} role=${u.role.padEnd(5)} status=${u.status}  name=${u.name}`);
  }

  // 6. Most-recent activities / tasks just for context
  const recentActivities = await prisma.activity.count({
    where: { createdAt: { gte: since } },
  });
  const recentTasks = await prisma.task.count({
    where: { createdAt: { gte: since } },
  });
  console.log("\n[6] ACTIVITY VOLUME (14d)");
  console.log(`    Activities: ${recentActivities}`);
  console.log(`    Tasks:      ${recentTasks}`);

  console.log("\nDone.");
}

main()
  .catch((e) => {
    console.error("ERROR:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
