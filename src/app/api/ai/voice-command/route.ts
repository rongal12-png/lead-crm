import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { openai, WHISPER_MODEL } from "@/lib/openai";
import { parseIntent } from "@/lib/ai/intent";
import { executeIntent } from "@/lib/ai/actions";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const formData = await req.formData();
  const audioFile = formData.get("audio") as File | null;

  if (!audioFile) {
    return NextResponse.json({ error: "Audio file required" }, { status: 400 });
  }

  // Transcribe with Whisper
  let transcript: string;
  try {
    const transcription = await openai.audio.transcriptions.create({
      file: audioFile,
      model: WHISPER_MODEL,
      language: "he", // Hebrew first, but Whisper auto-detects
      response_format: "text",
    });
    transcript = typeof transcription === "string" ? transcription : (transcription as { text: string }).text;
  } catch (error) {
    console.error("Transcription error:", error);
    return NextResponse.json({ error: "Failed to transcribe audio" }, { status: 500 });
  }

  if (!transcript?.trim()) {
    return NextResponse.json({ error: "No speech detected" }, { status: 400 });
  }

  // Parse intent
  const intent = await parseIntent(transcript, session.user.id);

  // Save command
  const command = await prisma.aICommand.create({
    data: {
      userId: session.user.id,
      leadId: intent.leadMatch?.leadId,
      inputType: "voice",
      transcript,
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
        transcript,
        requiresConfirmation: true,
        commandId: command.id,
        intent: intent.intent,
        confidence: intent.confidence,
        userFacingSummary: intent.userFacingSummary,
        proposedActions: intent.proposedActions,
      },
    });
  }

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
      transcript,
      requiresConfirmation: false,
      commandId: command.id,
      intent: intent.intent,
      confidence: intent.confidence,
      userFacingSummary: intent.userFacingSummary,
      result,
    },
  });
}
