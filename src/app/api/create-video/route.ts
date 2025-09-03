import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { ProjectService } from "@/lib/project-service";
import { VideoGenerationService } from "@/lib/video-generation-service";

interface CreateVideoRequest {
  script: string;
  videoType?: string;
  mediaType?: string;
  styleId?: string;
  imageModel?: string;
  voice?: string;
}

export async function POST(request: NextRequest) {
  const requestStartTime = Date.now();
  const requestId = `req_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

  console.log(`[API:CreateVideo] === REQUEST START === (${requestId})`);
  console.log(
    `[API:CreateVideo] Request received at ${new Date().toISOString()}`,
  );

  try {
    // Step 1: Authentication
    console.log(`[API:CreateVideo] ${requestId} - Checking authentication...`);
    const authStartTime = Date.now();
    const session = await auth();
    const authDuration = Date.now() - authStartTime;

    if (!session?.user?.id) {
      console.warn(
        `[API:CreateVideo] ${requestId} - Authentication failed after ${authDuration}ms`,
      );
      return NextResponse.json(
        { success: false, error: "Authentication required" },
        { status: 401 },
      );
    }

    const userId = session.user.id!;
    console.log(
      `[API:CreateVideo] ${requestId} - Authentication successful for user ${userId} (${authDuration}ms)`,
    );

    // Step 2: Parse and validate request body
    console.log(`[API:CreateVideo] ${requestId} - Parsing request body...`);
    const parseStartTime = Date.now();
    const body: CreateVideoRequest = await request.json();
    const {
      script,
      videoType = "faceless",
      mediaType = "AI Images",
      styleId,
      imageModel,
      voice = "echo",
    } = body;
    const parseDuration = Date.now() - parseStartTime;

    console.log(
      `[API:CreateVideo] ${requestId} - Request body parsed (${parseDuration}ms):`,
    );
    console.log(`[API:CreateVideo] ${requestId} - Parameters:`, {
      scriptLength: script?.length || 0,
      videoType,
      mediaType,
      styleId,
      imageModel,
      voice,
    });

    if (!script?.trim()) {
      console.warn(
        `[API:CreateVideo] ${requestId} - Validation failed: empty script`,
      );
      return NextResponse.json(
        { success: false, error: "Script is required" },
        { status: 400 },
      );
    }

    console.log(
      `[API:CreateVideo] ${requestId} - Script preview: "${script.substring(0, 100)}..."`,
    );

    // Step 3: Create project
    console.log(
      `[API:CreateVideo] ${requestId} - Creating project in database...`,
    );
    const projectCreateStartTime = Date.now();
    const project = await ProjectService.createProject(userId, {
      title: `Video Project - ${new Date().toLocaleDateString()}`,
      description: "AI generated video project",
      idea: script.slice(0, 200) + (script.length > 200 ? "..." : ""),
    });
    const projectCreateDuration = Date.now() - projectCreateStartTime;

    console.log(
      `[API:CreateVideo] ${requestId} - Project created successfully (${projectCreateDuration}ms):`,
    );
    console.log(`[API:CreateVideo] ${requestId} - Project ID: ${project.id}`);

    // Step 4: Update project status to generating
    console.log(
      `[API:CreateVideo] ${requestId} - Updating project status to 'generating'...`,
    );
    const updateStartTime = Date.now();
    await ProjectService.updateProject(project.id, userId, {
      status: "generating",
      script: script,
      scriptStyleId: styleId,
    });
    const updateDuration = Date.now() - updateStartTime;
    console.log(
      `[API:CreateVideo] ${requestId} - Project status updated (${updateDuration}ms)`,
    );

    // Step 5: Start video generation in background
    console.log(
      `[API:CreateVideo] ${requestId} - Starting background video generation...`,
    );
    VideoGenerationService.processCompleteVideo(project.id, userId, {
      script,
      styleId,
      imageModel,
      voice,
    }).catch((error) => {
      console.error(
        `[API:CreateVideo] ${requestId} - Background video generation failed:`,
        error,
      );
      // Update project status to failed
      ProjectService.updateProject(project.id, userId, {
        status: "failed",
      }).catch((updateError) => {
        console.error(
          `[API:CreateVideo] ${requestId} - Failed to update project status to failed:`,
          updateError,
        );
      });
    });

    console.log(
      `[API:CreateVideo] ${requestId} - Background process started successfully`,
    );

    // Step 6: Return response
    const totalDuration = Date.now() - requestStartTime;
    const response = {
      success: true,
      projectId: project.id,
      status: "generating",
      message:
        "Video generation started. Please wait while we process your video.",
    };

    console.log(`[API:CreateVideo] ${requestId} - Preparing response...`);
    console.log(`[API:CreateVideo] ${requestId} - Response data:`, response);
    console.log(`[API:CreateVideo] === REQUEST COMPLETED === (${requestId})`);
    console.log(
      `[API:CreateVideo] ${requestId} - Total request duration: ${totalDuration}ms`,
    );
    console.log(`[API:CreateVideo] ${requestId} - Performance breakdown:`);
    console.log(
      `[API:CreateVideo] ${requestId}   - Authentication: ${authDuration}ms`,
    );
    console.log(
      `[API:CreateVideo] ${requestId}   - Body parsing: ${parseDuration}ms`,
    );
    console.log(
      `[API:CreateVideo] ${requestId}   - Project creation: ${projectCreateDuration}ms`,
    );
    console.log(
      `[API:CreateVideo] ${requestId}   - Status update: ${updateDuration}ms`,
    );

    return NextResponse.json(response);
  } catch (error) {
    const totalDuration = Date.now() - requestStartTime;
    console.error(`[API:CreateVideo] === REQUEST FAILED === (${requestId})`);
    console.error(
      `[API:CreateVideo] ${requestId} - Request failed after ${totalDuration}ms:`,
      error,
    );
    console.error(`[API:CreateVideo] ${requestId} - Error details:`, {
      message: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 },
    );
  }
}
