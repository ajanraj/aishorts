import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { SpeechService } from "@/lib/speech-service";

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 },
      );
    }

    const { text, voice = "echo", index, projectId, segmentId } = await request.json();

    if (!text || typeof text !== "string") {
      return NextResponse.json(
        { error: "Text is required and must be a string" },
        { status: 400 },
      );
    }

    if (typeof index !== "number") {
      return NextResponse.json(
        { error: "Index is required and must be a number" },
        { status: 400 },
      );
    }

    const result = await SpeechService.generateSpeech(
      text,
      voice,
      session.user.id!,
      projectId,
      segmentId,
      index
    );

    return NextResponse.json({ 
      audioUrl: result.audioUrl,
      key: result.key,
      projectId: result.projectId,
      duration: result.duration,
      wordTimings: result.wordTimings || null
    });
  } catch (error) {
    console.error("Error generating speech:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 },
    );
  }
}
