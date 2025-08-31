import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { ProjectService } from "@/lib/project-service";
import { VideoGenerationService } from "@/lib/video-generation-service";

interface CreateVideoRequest {
  script: string;
  videoType?: string;
  mediaType?: string;
  styleId?: string;
  voice?: string;
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: "Authentication required" },
        { status: 401 },
      );
    }

    const body: CreateVideoRequest = await request.json();
    const {
      script,
      videoType = "faceless",
      mediaType = "AI Images",
      styleId,
      voice = "echo",
    } = body;

    if (!script?.trim()) {
      return NextResponse.json(
        { success: false, error: "Script is required" },
        { status: 400 },
      );
    }

    const userId = session.user.id!;

    // Step 1: Create project with "generating" status
    console.log("Creating project...");
    const project = await ProjectService.createProject(userId, {
      title: `Video Project - ${new Date().toLocaleDateString()}`,
      description: "AI generated video project",
      idea: script.slice(0, 200) + (script.length > 200 ? "..." : ""),
    });

    // Update status to generating
    await ProjectService.updateProject(project.id, userId, {
      status: "generating",
      script: script,
      scriptStyleId: styleId,
    });

    // Process video generation in the background
    VideoGenerationService.processCompleteVideo(project.id, userId, {
      script,
      styleId,
      voice,
    }).catch((error) => {
      console.error("Background video processing failed:", error);
      // Update project status to failed
      ProjectService.updateProject(project.id, userId, {
        status: "failed",
      }).catch(console.error);
    });

    return NextResponse.json({
      success: true,
      projectId: project.id,
      status: "generating",
      message:
        "Video generation started. Please wait while we process your video.",
    });
  } catch (error) {
    console.error("Error in create-video API:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 },
    );
  }
}
