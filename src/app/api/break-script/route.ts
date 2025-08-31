import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { VideoGenerationService } from "@/lib/video-generation-service";

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      console.log("Authentication required");
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 },
      );
    }

    const { script } = await request.json();

    if (!script || typeof script !== "string") {
      return NextResponse.json(
        { error: "Script is required and must be a string" },
        { status: 400 },
      );
    }

    const chunks = await VideoGenerationService.breakScriptIntoChunks(script);

    return NextResponse.json({ chunks });
  } catch (error) {
    console.error("Error breaking script:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 },
    );
  }
}
