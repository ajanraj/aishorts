import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { VideoGenerationService } from "@/lib/video-generation-service";

interface SingleImageRequest {
  type: "single";
  prompt: string;
  style?: string;
  imageSize?: string;
  model?: string;
  quality?: "low" | "medium" | "high";
  aspectRatio?: "square" | "portrait" | "landscape";
  storeInR2?: boolean;
  projectId?: string;
  segmentId?: string;
}

interface BatchImageRequest {
  type: "batch";
  storeInR2?: boolean;
  projectId?: string;
  prompts: Array<{
    prompt: string;
    style?: string;
    imageSize?: string;
    model?: string;
    quality?: "low" | "medium" | "high";
    aspectRatio?: "square" | "portrait" | "landscape";
    segmentId?: string;
  }>;
}

type ImageGenerationRequest = SingleImageRequest | BatchImageRequest;

interface ImageResult {
  success: boolean;
  imageUrl?: string;
  r2Key?: string;
  r2Url?: string;
  tempUrl?: string;
  fileRecord?: any;
  error?: string;
  prompt?: string;
}

// Helper function to generate single image using VideoGenerationService
async function generateImageWithService(
  prompt: string,
  style?: string,
  imageSize?: string,
  model?: string,
  quality?: "low" | "medium" | "high",
  aspectRatio?: "square" | "portrait" | "landscape",
  storeInR2?: boolean,
  userId?: string,
  projectId?: string,
  segmentId?: string,
  index: number = 0,
): Promise<ImageResult> {
  const result = await VideoGenerationService.generateSingleImage(
    prompt,
    model || "flux-schnell",
    style,
    imageSize || "portrait_16_9",
    quality,
    aspectRatio,
    storeInR2,
    userId,
    projectId,
    segmentId,
    index
  );

  return {
    success: result.success,
    imageUrl: result.imageUrl,
    error: result.error,
    prompt: result.prompt,
  };
}

export async function POST(request: NextRequest) {
  try {
    const body: ImageGenerationRequest = await request.json();

    // Get user session if R2 storage is requested
    let userId: string | undefined;
    if (
      (body.type === "single" && body.storeInR2) ||
      (body.type === "batch" && body.storeInR2)
    ) {
      const session = await auth();
      if (!session?.user?.id) {
        return NextResponse.json(
          { success: false, error: "Authentication required for R2 storage" },
          { status: 401 },
        );
      }
      userId = session.user.id;
    }

    if (body.type === "single") {
      // Single image generation for regeneration
      const result = await generateImageWithService(
        body.prompt,
        body.style,
        body.imageSize,
        body.model,
        body.quality,
        body.aspectRatio,
        body.storeInR2,
        userId,
        body.projectId,
        body.segmentId,
      );

      return NextResponse.json(result);
    } else if (body.type === "batch") {
      // Batch image generation for create-video flow
      const results: ImageResult[] = [];

      // Process images in parallel (no more artificial delays)
      for (let i = 0; i < body.prompts.length; i++) {
        const promptData = body.prompts[i];
        try {
          const result = await generateImageWithService(
            promptData.prompt,
            promptData.style,
            promptData.imageSize,
            promptData.model,
            promptData.quality,
            promptData.aspectRatio,
            body.storeInR2,
            userId,
            body.projectId,
            promptData.segmentId,
            i, // Pass the index
          );

          results.push(result);
        } catch (error) {
          console.error(
            "Error generating image for prompt:",
            promptData.prompt,
            error,
          );
          results.push({
            success: false,
            error:
              error instanceof Error
                ? error.message
                : "Failed to generate image",
            prompt: promptData.prompt,
          });
        }
      }

      return NextResponse.json({
        success: true,
        results,
        totalGenerated: results.filter((r) => r.success).length,
        totalRequested: body.prompts.length,
      });
    } else {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid request type. Must be 'single' or 'batch'",
        },
        { status: 400 },
      );
    }
  } catch (error) {
    console.error("Error in image generation API:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 },
    );
  }
}
