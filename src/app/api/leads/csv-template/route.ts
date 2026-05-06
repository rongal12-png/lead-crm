import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function csvEscape(v: string): string {
  if (/[",\n\r]/.test(v)) return `"${v.replace(/"/g, '""')}"`;
  return v;
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const leadTypes = await prisma.leadType.findMany({
    where: { isActive: true },
    select: { name: true },
    orderBy: { name: "asc" },
  });
  const typeNames = leadTypes.map((t) => t.name);

  const headers = [
    "displayName",
    "companyName",
    "leadType",
    "email",
    "phone",
    "country",
    "source",
    "potentialAmount",
    "currency",
    "priority",
    "nextFollowUpAt",
    "note",
  ];

  const examples: string[][] = [
    [
      "Alice Cohen",
      "Sequoia Capital",
      typeNames[0] ?? "VC",
      "alice@sequoia.com",
      "+1 555 1234",
      "US",
      "LinkedIn",
      "500000",
      "USD",
      "HIGH",
      "2026-06-01",
      "Met at YC demo day",
    ],
    [
      "Bob Dean",
      "Acme Corp",
      typeNames[1] ?? "Purchaser",
      "bob@acme.com",
      "+44 20 7946 0123",
      "UK",
      "Referral",
      "100000",
      "GBP",
      "MEDIUM",
      "",
      "Interested in Q3 expansion",
    ],
    [
      "Carla Levi",
      "",
      typeNames[2] ?? typeNames[0] ?? "Leader",
      "carla@example.com",
      "",
      "IL",
      "Conference",
      "",
      "",
      "LOW",
      "",
      "",
    ],
  ];

  const lines = [headers, ...examples].map((row) => row.map(csvEscape).join(","));
  // Prefix BOM so Excel opens UTF-8 correctly.
  const csv = "﻿" + lines.join("\r\n") + "\r\n";

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="leads-import-template.csv"',
    },
  });
}
