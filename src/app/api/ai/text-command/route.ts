import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { parseIntent } from "@/lib/ai/intent";
import { executeIntent } from "@/lib/ai/actions";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { text, confirmed, commandId } = await req.json();

  if (!text && !commandId) {
    return NextResponse.json({ error: "text or commandId required" }, { status: 400 });
  }

  // If confirming a previous command
  if (commandId && confirmed) {
    const command = await prisma.aICommand.findUnique({ where: { id: commandId } });
    if (!command) return NextResponse.json({ error: "Command not found" }, { status: 404 });

    const intent = {
      intent: command.detectedIntent ?? "",
      confidence: command.confidence ?? 0,
      leadMatch: (command.extractedData as { leadMatch?: { leadId: string; name: string; confidence: number } })?.leadMatch ?? null,
      updates: (command.extractedData as { updates?: Record<string, unknown> })?.updates,
      note: (command.extractedData as { note?: string })?.note,
      task: (command.extractedData as { task?: { title: string; type: string; dueAt?: string; priority?: string } })?.task,
      requiresConfirmation: false,
      userFacingSummary: (command.extractedData as { userFacingSummary?: string })?.userFacingSummary ?? "",
      proposedActions: (command.proposedActions as Array<{ type: string; description: string; data: Record<string, unknown>; sensitive: boolean }>) ?? [],
    };

    const result = await executeIntent(intent, session.user.id, true);

    await prisma.aICommand.update({
      where: { id: commandId },
      data: {
        status: result.success ? "EXECUTED" : "FAILED",
        executedActions: result.data,
      },
    });

    return NextResponse.json({ success: true, data: result });
  }

  // New command
  if (!text) return NextResponse.json({ error: "text required" }, { status: 400 });

  let intent;
  try {
    intent = await parseIntent(text, session.user.id);
  } catch (err) {
    const e = err as { status?: number; code?: string; message?: string };
    const message = e?.message ?? "Unknown error";
    if (e?.status === 429 || /quota|insufficient_quota|billing/i.test(message)) {
      return NextResponse.json(
        { success: false, error: "המכסה ב־OpenAI הסתיימה. צריך להוסיף קרדיט בחשבון: https://platform.openai.com/account/billing" },
        { status: 402 }
      );
    }
    if (e?.status === 401 || /api[_ ]?key/i.test(message)) {
      return NextResponse.json(
        { success: false, error: "מפתח OpenAI לא תקין או חסר. בדוק את OPENAI_API_KEY בקובץ .env" },
        { status: 401 }
      );
    }
    return NextResponse.json(
      { success: false, error: `AI parse failed: ${message}` },
      { status: 502 }
    );
  }

  const command = await prisma.aICommand.create({
    data: {
      userId: session.user.id,
      leadId: intent.leadMatch?.leadId,
      inputType: "text",
      originalText: text,
      detectedIntent: intent.intent,
      confidence: intent.confidence,
      extractedData: {
        leadMatch: intent.leadMatch,
        updates: intent.updates,
        note: intent.note,
        task: intent.task,
        userFacingSummary: intent.userFacingSummary,
      },
      proposedActions: intent.proposedActions,
      requiresConfirmation: intent.requiresConfirmation,
      status: "PENDING",
      userFacingSummary: intent.userFacingSummary,
    },
  });

  if (intent.requiresConfirmation) {
    return NextResponse.json({
      success: true,
      data: {
        requiresConfirmation: true,
        commandId: command.id,
        intent: intent.intent,
        confidence: intent.confidence,
        userFacingSummary: intent.userFacingSummary,
        proposedActions: intent.proposedActions,
      },
    });
  }

  // Execute immediately if no confirmation needed
  const result = await executeIntent(intent, session.user.id, false);

  await prisma.aICommand.update({
    where: { id: command.id },
    data: {
      status: result.success ? "EXECUTED" : "FAILED",
      executedActions: result.data,
    },
  });

  return NextResponse.json({
    success: true,
    data: {
      requiresConfirmation: false,
      commandId: command.id,
      intent: intent.intent,
      confidence: intent.confidence,
      userFacingSummary: intent.userFacingSummary,
      result,
    },
  });
}
