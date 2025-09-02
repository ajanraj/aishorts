import { NextRequest, NextResponse } from "next/server";
import path from "path";

export async function GET(req: NextRequest) {
  try {
    // This endpoint serves the Remotion bundle for Lambda rendering
    // In production, you would serve the actual bundled Remotion code
    // For now, we return the necessary information for Lambda to find our composition
    
    const remotionRoot = path.resolve("src/remotion/Root.tsx");
    const serveUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3030'}/api/remotion/bundle`;
    
    return NextResponse.json({
      serveUrl,
      entryPoint: remotionRoot,
      compositions: [
        {
          id: "VideoComposition",
          width: 1080,
          height: 1920,
          fps: 30,
          durationInFrames: 900, // 30 seconds at 30fps
        }
      ]
    });
  } catch (error) {
    console.error("Remotion endpoint error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}