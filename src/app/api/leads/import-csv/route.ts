import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const PRIORITIES = ["LOW", "MEDIUM", "HIGH", "URGENT"] as const;
type Priority = (typeof PRIORITIES)[number];

function parseCSV(text: string): string[][] {
  // Strip UTF-8 BOM if present
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);

  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;
  let i = 0;

  while (i < text.length) {
    const c = text[i];

    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          cell += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i++;
        continue;
      }
      cell += c;
      i++;
      continue;
    }

    if (c === '"') {
      inQuotes = true;
      i++;
      continue;
    }
    if (c === ",") {
      row.push(cell);
      cell = "";
      i++;
      continue;
    }
    if (c === "\r") {
      i++;
      continue;
    }
    if (c === "\n") {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
      i++;
      continue;
    }
    cell += c;
    i++;
  }

  if (cell !== "" || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }

  return rows;
}

const HEADER_ALIASES: Record<string, string[]> = {
  displayName: ["displayname", "name", "fullname", "full name"],
  firstName: ["firstname", "first name"],
  lastName: ["lastname", "last name"],
  companyName: ["companyname", "company", "fund", "company / fund"],
  leadType: ["leadtype", "type"],
  email: ["email", "e-mail"],
  phone: ["phone", "mobile", "telephone"],
  country: ["country"],
  source: ["source"],
  potentialAmount: ["potentialamount", "potential", "amount", "potential amount"],
  currency: ["currency"],
  priority: ["priority"],
  nextFollowUpAt: ["nextfollowupat", "followup", "follow up", "next follow-up"],
  note: ["note", "notes", "comment"],
};

function buildColumnIndex(headers: string[]): Record<string, number> {
  const normalized = headers.map((h) => h.trim().toLowerCase());
  const index: Record<string, number> = {};
  for (const [field, aliases] of Object.entries(HEADER_ALIASES)) {
    for (const alias of aliases) {
      const i = normalized.indexOf(alias);
      if (i !== -1) {
        index[field] = i;
        break;
      }
    }
  }
  return index;
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden — admin only" }, { status: 403 });
  }

  let csv: string;
  try {
    const body = await req.json();
    csv = typeof body.csv === "string" ? body.csv : "";
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!csv.trim()) return NextResponse.json({ error: "Empty CSV" }, { status: 400 });

  const rows = parseCSV(csv);
  if (rows.length < 2) {
    return NextResponse.json(
      { error: "CSV must include a header row and at least one data row" },
      { status: 400 }
    );
  }

  const headers = rows[0];
  const colIndex = buildColumnIndex(headers);
  const dataRows = rows.slice(1);

  const [leadTypes, pipelines] = await Promise.all([
    prisma.leadType.findMany({ where: { isActive: true } }),
    prisma.pipeline.findMany({
      include: { stages: { orderBy: { order: "asc" }, take: 1 } },
    }),
  ]);

  const leadTypeByName = new Map<string, (typeof leadTypes)[0]>();
  for (const lt of leadTypes) {
    leadTypeByName.set(lt.name.toLowerCase().trim(), lt);
  }

  const pipelineFirstStage = new Map<string, string | undefined>();
  for (const p of pipelines) {
    pipelineFirstStage.set(p.id, p.stages[0]?.id);
  }

  const get = (row: string[], field: string): string | undefined => {
    const idx = colIndex[field];
    if (idx === undefined) return undefined;
    const v = row[idx]?.trim();
    return v && v.length > 0 ? v : undefined;
  };

  const failed: { row: number; errors: string[] }[] = [];
  let created = 0;

  for (let i = 0; i < dataRows.length; i++) {
    const row = dataRows[i];
    const rowNumber = i + 2; // +2: account for 1-indexed and header
    const errors: string[] = [];

    if (row.every((c) => !c?.trim())) continue;

    const displayName = get(row, "displayName");
    const firstName = get(row, "firstName");
    const lastName = get(row, "lastName");
    const companyName = get(row, "companyName");
    const email = get(row, "email");
    const phone = get(row, "phone");
    const country = get(row, "country");
    const source = get(row, "source");
    const leadTypeName = get(row, "leadType");
    const potentialAmountStr = get(row, "potentialAmount");
    const currency = get(row, "currency");
    const priorityRaw = get(row, "priority");
    const followUpStr = get(row, "nextFollowUpAt");
    const note = get(row, "note");

    let leadTypeId: string | undefined;
    if (leadTypeName) {
      const lt = leadTypeByName.get(leadTypeName.toLowerCase());
      if (lt) leadTypeId = lt.id;
      else
        errors.push(
          `Unknown lead type "${leadTypeName}" — must match one of: ${leadTypes
            .map((l) => l.name)
            .join(", ")}`
        );
    }

    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.push(`Invalid email: "${email}"`);
    }

    let potentialAmount: number | undefined;
    if (potentialAmountStr) {
      const num = Number(potentialAmountStr.replace(/[, $]/g, ""));
      if (Number.isNaN(num)) errors.push(`Invalid amount: "${potentialAmountStr}"`);
      else potentialAmount = num;
    }

    let priority: Priority | undefined;
    if (priorityRaw) {
      const upper = priorityRaw.toUpperCase() as Priority;
      if ((PRIORITIES as readonly string[]).includes(upper)) priority = upper;
      else
        errors.push(
          `Invalid priority "${priorityRaw}" — use LOW / MEDIUM / HIGH / URGENT`
        );
    }

    let nextFollowUpAt: Date | undefined;
    if (followUpStr) {
      const d = new Date(followUpStr);
      if (Number.isNaN(d.getTime())) errors.push(`Invalid date: "${followUpStr}"`);
      else nextFollowUpAt = d;
    }

    if (errors.length > 0) {
      failed.push({ row: rowNumber, errors });
      continue;
    }

    let pipelineId: string | undefined;
    let stageId: string | undefined;
    if (leadTypeId) {
      const lt = leadTypes.find((l) => l.id === leadTypeId);
      if (lt?.defaultPipelineId) {
        pipelineId = lt.defaultPipelineId;
        stageId = pipelineFirstStage.get(pipelineId);
      }
    }

    const fallbackName =
      displayName ||
      [firstName, lastName].filter(Boolean).join(" ").trim() ||
      companyName ||
      email ||
      phone ||
      "Imported Lead";

    try {
      const lead = await prisma.lead.create({
        data: {
          displayName: fallbackName,
          firstName,
          lastName,
          companyName,
          email: email || undefined,
          phone,
          country,
          source,
          leadTypeId,
          pipelineId,
          stageId,
          ownerId: session.user.id,
          createdBy: session.user.id,
          potentialAmount,
          currency,
          priority,
          nextFollowUpAt,
          tags: [],
          lastActivityAt: new Date(),
        },
      });

      await prisma.activity.create({
        data: {
          leadId: lead.id,
          userId: session.user.id,
          type: "LEAD_CREATED",
          title: "Lead imported from CSV",
          content: note,
        },
      });

      if (stageId) {
        await prisma.stageHistory.create({
          data: { leadId: lead.id, stageId, userId: session.user.id },
        });
      }

      created++;
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      failed.push({ row: rowNumber, errors: [`Database error: ${msg}`] });
    }
  }

  await prisma.auditLog.create({
    data: {
      actorUserId: session.user.id,
      entityType: "Lead",
      action: "BULK_IMPORT",
      after: { created, failedCount: failed.length, total: dataRows.length },
      ipAddress: req.headers.get("x-forwarded-for") ?? undefined,
    },
  });

  return NextResponse.json({ created, failed, total: dataRows.length });
}
