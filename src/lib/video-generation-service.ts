import OpenAI from "openai";
import { ProjectService } from "@/lib/project-service";
import { getImageStyle, getDefaultImageStyle } from "@/lib/image-config";
import { getAudioDurationWithFallback } from "@/lib/audio-utils";
import { FalAIService } from "@/lib/falai-service";
import { OpenAIService } from "@/lib/openai-service";
import { R2Storage } from "@/lib/r2-storage";
import { parseStructuredOutput } from "@/lib/api-utils";
import {
  TranscriptionService,
  type WordTiming,
} from "@/lib/transcription-service";

// MP3 frame header parsing utilities
function getMP3Duration(buffer: Buffer): number | null {
  try {
    // MP3 frame header constants
    const SAMPLES_PER_FRAME = 1152; // For MPEG 1 Layer 3

    let offset = 0;
    let totalSamples = 0;
    let sampleRate = 0;
    let frameCount = 0;

    // Skip ID3 header if present
    if (buffer.subarray(0, 3).toString() === "ID3") {
      const id3Size =
        (buffer[6] << 21) | (buffer[7] << 14) | (buffer[8] << 7) | buffer[9];
      offset = id3Size + 10;
    }

    while (offset < buffer.length - 4) {
      // Look for MP3 frame sync (11111111 111)
      if (buffer[offset] === 0xff && (buffer[offset + 1] & 0xe0) === 0xe0) {
        const header =
          (buffer[offset] << 24) |
          (buffer[offset + 1] << 16) |
          (buffer[offset + 2] << 8) |
          buffer[offset + 3];

        // Parse header
        const version = (header >> 19) & 3;
        const layer = (header >> 17) & 3;
        const bitrateIndex = (header >> 12) & 15;
        const sampleRateIndex = (header >> 10) & 3;

        if (
          version === 1 &&
          layer === 1 &&
          bitrateIndex !== 0 &&
          bitrateIndex !== 15 &&
          sampleRateIndex !== 3
        ) {
          // MPEG 1 Layer 3 (MP3)
          const bitrates = [
            0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320, 0,
          ];
          const sampleRates = [44100, 48000, 32000, 0];

          const bitrate = bitrates[bitrateIndex] * 1000;
          sampleRate = sampleRates[sampleRateIndex];

          if (bitrate && sampleRate) {
            const frameLength = Math.floor(
              (SAMPLES_PER_FRAME * bitrate) / (sampleRate * 8),
            );
            totalSamples += SAMPLES_PER_FRAME;
            frameCount++;
            offset += frameLength;
            continue;
          }
        }
      }
      offset++;
    }

    if (frameCount > 0 && sampleRate > 0) {
      return totalSamples / sampleRate;
    }

    return null;
  } catch (error) {
    console.warn("Error parsing MP3 duration from buffer:", error);
    return null;
  }
}

// Alternative: Simple estimation based on bitrate and file size
function estimateMP3Duration(buffer: Buffer): number {
  // OpenAI TTS typically generates MP3s at ~128kbps
  const estimatedBitrate = 128000; // bits per second
  const fileSizeInBits = buffer.length * 8;
  return fileSizeInBits / estimatedBitrate;
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

export interface VideoSegmentData {
  text: string;
  imagePrompt: string;
  order: number;
}

export interface MediaGenerationResult {
  imageResults: Array<{
    success: boolean;
    imageUrl?: string;
    error?: string;
    prompt: string;
    index: number;
  }>;
  audioResults: Array<{
    index: number;
    audioUrl: string;
    duration: number;
    segmentId: string;
    wordTimings?: WordTiming[];
  }>;
}

export class VideoGenerationService {
  /**
   * Break script into meaningful chunks for video segments
   */
  static async breakScriptIntoChunks(script: string): Promise<string[]> {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `You are a video script segmenter. Break down the provided script into meaningful chunks WITHOUT modifying the original text. Each chunk should:
1. Be 3-5 seconds of speaking time (roughly 8-15 words)
2. Form a complete thought or sentence fragment that makes sense
3. Be suitable for generating a single image that represents the content
4. Flow naturally from one chunk to the next
5. There can be a maximum of only 10 chunks
6. IMPORTANT: Use the EXACT original text without any modifications, corrections, or improvements

The response will be structured as a JSON object with a "chunks" array containing the original script segments.`,
        },
        {
          role: "user",
          content: script,
        },
      ],
      temperature: 1,
      response_format: { type: "json_object" },
    });

    const result = parseStructuredOutput<{ chunks: string[] }>(
      completion.choices[0].message.content || "{}",
    );

    if (!result.success || !result.data) {
      throw new Error("Failed to parse script chunks");
    }

    return result.data.chunks;
  }

  /**
   * Generate image prompts for video segments
   */
  static async generateImagePrompts(
    chunks: string[],
    styleId?: string,
    style?: string,
  ): Promise<string[]> {
    const imageStyle =
      (styleId && getImageStyle(styleId)) || getDefaultImageStyle();
    const styleName = style || "dark and eerie";

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-2024-08-06",
      messages: [
        {
          role: "system",
          content: `You are an expert at creating detailed image prompts for AI image generation. For each script chunk provided, create a compelling visual prompt that:

1. Captures the essence and mood of the text
2. Is optimized for the ${styleName} visual style
3. Includes cinematic composition details
4. Specifies lighting, atmosphere, and visual effects
5. Is detailed enough to generate high-quality, engaging images

Base image style: ${imageStyle.systemPrompt}

Style guidelines for "${styleName}":
- Dark, moody atmosphere with dramatic lighting
- High contrast and rich shadows
- Cinematic composition with depth
- Detailed textures and atmospheric effects

Return a JSON object with "prompts" array containing one detailed prompt for each chunk.`,
        },
        {
          role: "user",
          content: `Create image prompts for these script chunks: ${JSON.stringify(chunks)}`,
        },
      ],
      temperature: 0.8,
      response_format: { type: "json_object" },
    });

    const result = parseStructuredOutput<{ prompts: string[] }>(
      completion.choices[0].message.content || "{}",
    );

    if (!result.success || !result.data) {
      throw new Error("Failed to parse image prompts");
    }

    return result.data.prompts;
  }

  /**
   * Generate audio for a text segment with word-level timestamps
   */
  static async generateAudio(
    text: string,
    voice: string,
    userId: string,
    projectId: string,
    segmentId: string,
    index: number,
  ): Promise<{
    audioUrl: string;
    key: string;
    duration: number;
    wordTimings?: WordTiming[];
  }> {
    // Generate speech using OpenAI TTS
    const mp3 = await openai.audio.speech.create({
      model: "gpt-4o-mini-tts",
      voice: voice as "alloy" | "echo" | "fable" | "onyx" | "nova" | "shimmer",
      input: text,
    });

    // Convert response to buffer
    const buffer = Buffer.from(await mp3.arrayBuffer());

    // Get duration from buffer
    let duration = 0;

    // Generate word-level timestamps using transcription service
    let wordTimings: WordTiming[] | undefined;
    try {
      console.log(`Generating word timestamps for segment ${index}...`);
      const transcriptionResult =
        await TranscriptionService.transcribeAudio(buffer);
      wordTimings = transcriptionResult.words;
      duration = transcriptionResult.duration;
      console.log(
        `Generated ${wordTimings.length} word timestamps for segment ${index}`,
      );
    } catch (error) {
      console.warn(
        `Failed to generate word timestamps for segment ${index}:`,
        error,
      );
      // Continue without word timings rather than failing the entire process
    }

    // Upload to R2 storage
    const { key, url } = await R2Storage.uploadAudio(
      buffer,
      userId,
      projectId,
      index,
      segmentId,
    );

    // Create file record in database
    await ProjectService.createFile({
      projectId: projectId,
      segmentId: segmentId,
      fileType: "audio",
      fileName: `audio_${segmentId}_${Date.now()}.mp3`,
      originalName: `segment_${index}_audio.mp3`,
      mimeType: "audio/mpeg",
      fileSize: buffer.length,
      r2Key: key,
      r2Url: url,
      uploadStatus: "completed",
      metadata: {
        text: text,
        voice: voice,
        duration: duration,
        generatedAt: new Date().toISOString(),
        wordTimings: wordTimings || null,
      },
    });

    return { audioUrl: url, key, duration, wordTimings };
  }

  /**
   * Generate image using appropriate service (OpenAI or FalAI)
   */
  static async generateImage(
    prompt: string,
    model: string,
    style: string | undefined,
    imageSize: string,
    userId: string,
    projectId: string,
    segmentId: string,
    index: number,
  ): Promise<{ success: boolean; imageUrl?: string; error?: string }> {
    try {
      if (this.isOpenAIModel(model)) {
        // Use OpenAI service for DALL-E models (already handles R2 upload and file record creation)
        return await OpenAIService.generateImage({
          prompt,
          style,
          imageSize,
          storeInR2: true,
          userId,
          projectId,
          segmentId,
        });
      } else {
        // Use FalAI service for Flux models
        const falAIResult = await FalAIService.generateImage(
          prompt,
          style,
          imageSize,
          model,
        );

        if (falAIResult.success && falAIResult.imageUrl) {
          // Download the image and upload to R2
          try {
            const imageResponse = await fetch(falAIResult.imageUrl);
            if (!imageResponse.ok) {
              throw new Error(
                `Failed to download image: ${imageResponse.statusText}`,
              );
            }

            const imageBuffer = Buffer.from(await imageResponse.arrayBuffer());

            // Upload to R2 storage
            const { key, url } = await R2Storage.uploadImage(
              imageBuffer,
              userId,
              projectId,
              index,
              segmentId,
            );

            // Create file record in database
            await ProjectService.createFile({
              projectId: projectId,
              segmentId: segmentId,
              fileType: "image",
              fileName: `image_${segmentId}_${Date.now()}.jpg`,
              originalName: `segment_${index}_image.jpg`,
              mimeType: "image/jpeg",
              fileSize: imageBuffer.length,
              r2Key: key,
              r2Url: url,
              uploadStatus: "completed",
              metadata: {
                prompt: prompt,
                model: model,
                generatedAt: new Date().toISOString(),
              },
            });

            return {
              success: true,
              imageUrl: url,
            };
          } catch (uploadError) {
            console.error("Failed to upload FalAI image to R2:", uploadError);
            // Fallback to original FalAI result if R2 upload fails
            return falAIResult;
          }
        } else {
          return falAIResult;
        }
      }
    } catch (error) {
      console.error("Error generating image:", error);
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to generate image",
      };
    }
  }

  /**
   * Generate all media (images and audio) in parallel for video segments
   */
  static async generateMediaInParallel(
    segments: VideoSegmentData[],
    createdSegments: Array<{ id: string }>,
    styleId: string | undefined,
    voice: string,
    userId: string,
    projectId: string,
  ): Promise<MediaGenerationResult> {
    const imageStyle = styleId
      ? getImageStyle(styleId)
      : getDefaultImageStyle();

    // Prepare image generation requests
    const imagePrompts = segments.map((segment, index) => {
      const enhancedPrompt = imageStyle
        ? `${imageStyle.systemPrompt}. ${segment.imagePrompt}`
        : segment.imagePrompt;

      const modelKey = imageStyle?.model.includes("schnell")
        ? "flux-schnell"
        : imageStyle?.model.includes("dev")
          ? "flux-dev"
          : imageStyle?.model.includes("pro")
            ? "flux-pro"
            : "flux-schnell";

      return {
        prompt: enhancedPrompt,
        style: imageStyle?.name,
        imageSize: "portrait_16_9",
        model: modelKey,
        segmentId: createdSegments[index].id,
        index,
      };
    });

    // Prepare audio generation requests
    const audioPromises = segments.map(async (segment, index) => {
      const result = await this.generateAudio(
        segment.text,
        voice,
        userId,
        projectId,
        createdSegments[index].id,
        index,
      );

      return {
        index,
        audioUrl: result.audioUrl,
        duration: result.duration,
        segmentId: createdSegments[index].id,
        wordTimings: result.wordTimings,
      };
    });

    // Generate images
    const imageGenerationPromises = imagePrompts.map(async (promptData) => {
      const result = await this.generateImage(
        promptData.prompt,
        promptData.model,
        promptData.style,
        promptData.imageSize,
        userId,
        projectId,
        promptData.segmentId,
        promptData.index,
      );

      return {
        ...result,
        prompt: promptData.prompt,
        index: promptData.index,
      };
    });

    // Execute parallel generation
    const [imageResults, audioResults] = await Promise.all([
      Promise.all(imageGenerationPromises),
      Promise.all(audioPromises),
    ]);

    return { imageResults, audioResults };
  }

  /**
   * Process complete video generation pipeline
   */
  static async processCompleteVideo(
    projectId: string,
    userId: string,
    params: {
      script: string;
      styleId?: string;
      voice: string;
    },
  ): Promise<void> {
    const { script, styleId, voice } = params;

    // Step 1: Break script into chunks
    console.log("Breaking script into segments...");
    const chunks = await this.breakScriptIntoChunks(script);

    // Step 2: Generate image prompts
    console.log("Generating image prompts...");
    const imageStyle = styleId
      ? getImageStyle(styleId)
      : getDefaultImageStyle();
    const prompts = await this.generateImagePrompts(
      chunks,
      styleId,
      imageStyle?.name ?? getDefaultImageStyle().name,
    );

    // Step 3: Create segments in batch
    console.log("Creating segments...");
    const segments: VideoSegmentData[] = chunks.map(
      (chunk: string, index: number) => ({
        text: chunk,
        imagePrompt: prompts[index] || `Visual representation of: ${chunk}`,
        order: index,
      }),
    );

    const createdSegments = await ProjectService.createSegmentsBatch(
      projectId,
      userId,
      segments,
    );

    // Step 4: Parallel media generation
    console.log("Starting parallel media generation...");
    const { imageResults, audioResults } = await this.generateMediaInParallel(
      segments,
      createdSegments,
      styleId,
      voice,
      userId,
      projectId,
    );

    console.log("Media generation completed");

    // Step 5: Update segments with generated media URLs, durations, and word timings
    const updatePromises = createdSegments.map(async (segment, index) => {
      const updates: any = {};

      // Update image URL if generation was successful
      const imageResult = imageResults.find((r) => r.index === index);
      if (imageResult?.success && imageResult.imageUrl) {
        updates.imageUrl = imageResult.imageUrl;
      }

      // Update audio URL, duration, and word timings
      const audioResult = audioResults.find((r) => r.index === index);
      if (audioResult) {
        updates.audioUrl = audioResult.audioUrl;
        updates.duration = audioResult.duration;

        // Update word timings if available
        if (audioResult.wordTimings && audioResult.wordTimings.length > 0) {
          updates.wordTimings = audioResult.wordTimings;
        }
      }

      if (Object.keys(updates).length > 0) {
        return ProjectService.updateSegment(segment.id, userId, updates);
      }
      return segment;
    });

    await Promise.all(updatePromises);

    // Step 6: Calculate total duration and update project status
    const totalDuration = audioResults.reduce(
      (sum, result) => sum + result.duration,
      0,
    );

    await ProjectService.updateProject(projectId, userId, {
      status: "completed",
      duration: totalDuration,
    });

    console.log(
      `Video generation completed for project ${projectId}. Total duration: ${totalDuration.toFixed(2)}s`,
    );
  }

  /**
   * Generate single audio file (for regeneration use cases) with word-level timestamps
   */
  static async generateSingleAudio(
    text: string,
    voice: string,
    userId: string,
    projectId?: string,
    segmentId?: string,
    index: number = 0,
  ): Promise<{
    audioUrl: string;
    key: string;
    projectId: string;
    duration: number;
    wordTimings?: WordTiming[];
  }> {
    // Generate speech using OpenAI TTS
    const mp3 = await openai.audio.speech.create({
      model: "gpt-4o-mini-tts",
      voice: voice as "alloy" | "echo" | "fable" | "onyx" | "nova" | "shimmer",
      input: text,
    });

    // Convert response to buffer
    const buffer = Buffer.from(await mp3.arrayBuffer());

    // Generate project ID if not provided
    const finalProjectId =
      projectId ||
      `project_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;

    // Get duration from buffer
    const duration = getMP3Duration(buffer) || estimateMP3Duration(buffer);

    // Generate word-level timestamps using transcription service
    let wordTimings: WordTiming[] | undefined;
    try {
      console.log(
        `Generating word timestamps for single audio segment ${index}...`,
      );
      const transcriptionResult =
        await TranscriptionService.transcribeAudio(buffer);
      wordTimings = transcriptionResult.words;
      console.log(
        `Generated ${wordTimings.length} word timestamps for single audio segment ${index}`,
      );
    } catch (error) {
      console.warn(
        `Failed to generate word timestamps for single audio segment ${index}:`,
        error,
      );
      // Continue without word timings rather than failing the entire process
    }

    // Upload to R2 storage
    const { key, url } = await R2Storage.uploadAudio(
      buffer,
      userId,
      finalProjectId,
      index,
      segmentId,
    );

    // Create file record in database if we have a project and segment
    if (segmentId) {
      await ProjectService.createFile({
        projectId: finalProjectId,
        segmentId: segmentId,
        fileType: "audio",
        fileName: `audio_${segmentId}_${Date.now()}.mp3`,
        originalName: `segment_${index}_audio.mp3`,
        mimeType: "audio/mpeg",
        fileSize: buffer.length,
        r2Key: key,
        r2Url: url,
        uploadStatus: "completed",
        metadata: {
          text: text,
          voice: voice,
          duration: duration,
          generatedAt: new Date().toISOString(),
          wordTimings: wordTimings || null,
        },
      });
    }

    return {
      audioUrl: url,
      key,
      projectId: finalProjectId,
      duration,
      wordTimings,
    };
  }

  /**
   * Generate single image (for regeneration use cases)
   */
  static async generateSingleImage(
    prompt: string,
    model: string = "flux-schnell",
    style?: string,
    imageSize: string = "portrait_16_9",
    quality?: "low" | "medium" | "high",
    aspectRatio?: "square" | "portrait" | "landscape",
    storeInR2?: boolean,
    userId?: string,
    projectId?: string,
    segmentId?: string,
    index: number = 0,
  ): Promise<{
    success: boolean;
    imageUrl?: string;
    error?: string;
    prompt: string;
  }> {
    try {
      if (storeInR2 && userId && projectId && segmentId) {
        // Use the full image generation with R2 upload
        const result = await this.generateImage(
          prompt,
          model,
          style,
          imageSize,
          userId,
          projectId,
          segmentId,
          index,
        );
        return {
          ...result,
          prompt,
        };
      } else {
        // Simple generation without R2 storage
        if (this.isOpenAIModel(model)) {
          const result = await OpenAIService.generateImage({
            prompt,
            style,
            imageSize,
            quality,
            aspectRatio,
            storeInR2: false,
            userId,
            projectId,
            segmentId,
          });
          return {
            ...result,
            prompt,
          };
        } else {
          const result = await FalAIService.generateImage(
            prompt,
            style,
            imageSize,
            model,
          );
          return {
            ...result,
            prompt,
          };
        }
      }
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to generate image",
        prompt,
      };
    }
  }

  /**
   * Utility function to determine which service to use based on model
   */
  private static isOpenAIModel(model?: string): boolean {
    return model === "dall-e-3" || model === "gpt-image-1";
  }
}
