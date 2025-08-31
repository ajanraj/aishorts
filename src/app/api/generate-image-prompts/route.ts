import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { VideoGenerationService } from "@/lib/video-generation-service";

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 },
      );
    }

    const { chunks, styleId, style = "dark and eerie" } = await request.json();

    if (!chunks || !Array.isArray(chunks)) {
      return NextResponse.json(
        { error: "Chunks array is required" },
        { status: 400 },
      );
    }

    const prompts = await VideoGenerationService.generateImagePrompts(chunks, styleId, style);

    return NextResponse.json({ prompts });
  } catch (error) {
    console.error("Error generating image prompts:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 },
    );
  }
}
