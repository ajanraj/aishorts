import { experimental_generateSpeech as generateSpeech } from "ai";
import { openai } from "@ai-sdk/openai";
import { elevenlabs } from "@ai-sdk/elevenlabs";
import { R2Storage } from "@/lib/r2-storage";
import { TranscriptionService } from "@/lib/transcription-service";
import { ProjectService } from "@/lib/project-service";
import { VoiceConfigManager } from "@/lib/voice-config";

export interface SpeechGenerationResult {
  audioUrl: string;
  key: string;
  duration: number;
  wordTimings?: any[];
  projectId: string;
}

export class SpeechService {
  /**
   * Determines if a voice ID belongs to ElevenLabs
   */
  static isElevenLabsVoice(voiceId: string): boolean {
    return VoiceConfigManager.isElevenLabsVoice(voiceId);
  }

  /**
   * Determines if a voice ID belongs to OpenAI
   */
  static isOpenAIVoice(voiceId: string): boolean {
    return VoiceConfigManager.isOpenAIVoice(voiceId);
  }

  /**
   * Generate speech using the appropriate provider based on voice ID
   */
  static async generateSpeech(
    text: string,
    voiceId: string,
    userId: string,
    projectId?: string,
    segmentId?: string,
    index: number = 0,
  ): Promise<SpeechGenerationResult> {
    const startTime = Date.now();
    console.log(
      `[SpeechService] Starting speech generation for voice: ${voiceId}`,
    );
    console.log(`[SpeechService] Text length: ${text.length} characters`);
    console.log(`[SpeechService] Text preview: "${text.substring(0, 100)}..."`);

    try {
      let audioResult;

      if (this.isElevenLabsVoice(voiceId)) {
        console.log(`[SpeechService] Using ElevenLabs for voice: ${voiceId}`);
        audioResult = await generateSpeech({
          model: elevenlabs.speech("eleven_multilingual_v2"),
          text,
          voice: voiceId,
          providerOptions: {
            elevenlabs: {
              voice_settings: {
                stability: 0.5,
                similarity_boost: 0.75,
              },
            },
          },
        });
      } else if (this.isOpenAIVoice(voiceId)) {
        console.log(`[SpeechService] Using OpenAI for voice: ${voiceId}`);
        audioResult = await generateSpeech({
          model: openai.speech("tts-1"),
          text,
          voice: voiceId as
            | "alloy"
            | "echo"
            | "fable"
            | "onyx"
            | "nova"
            | "shimmer",
        });
      } else {
        throw new Error(`Unknown voice provider for voice: ${voiceId}`);
      }

      console.log(
        `[SpeechService] Audio result: ${JSON.stringify(audioResult)}`,
      );

      // Convert audio to buffer
      const buffer = Buffer.from(audioResult.audio.uint8Array);

      console.log(
        `[SpeechService] Generated audio buffer of ${buffer.length} bytes`,
      );

      // Generate project ID if not provided
      const finalProjectId =
        projectId ||
        `project_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;

      // Generate word-level timestamps using transcription service
      let duration = 0;
      let wordTimings: any[] | undefined;

      try {
        console.log(`[SpeechService] Generating word timestamps...`);
        const transcriptionResult =
          await TranscriptionService.transcribeAudio(buffer);

        // Convert flat word timings to batched structure (default 3 words per batch)
        const batchedTimings = TranscriptionService.convertToWordBatches(
          transcriptionResult.words,
          3,
        );

        duration = transcriptionResult.duration;
        wordTimings = batchedTimings;

        console.log(
          `[SpeechService] Generated ${batchedTimings.length} batched word groups, duration: ${duration}s`,
        );
      } catch (error) {
        console.warn(
          `[SpeechService] Failed to generate word timestamps:`,
          error,
        );
        // Continue without word timings rather than failing the entire process
      }

      // Upload to R2 storage
      console.log(`[SpeechService] Uploading to R2 storage...`);
      const { key, url } = await R2Storage.uploadAudio(
        buffer,
        userId,
        finalProjectId,
        index,
        segmentId,
      );

      // Create file record in database if we have a project and segment
      if (segmentId) {
        console.log(`[SpeechService] Creating file record in database...`);
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
            voice: voiceId,
            provider: this.isElevenLabsVoice(voiceId) ? "elevenlabs" : "openai",
            duration: duration,
            generatedAt: new Date().toISOString(),
            wordTimings: wordTimings || null,
          },
        });
      }

      const totalTime = Date.now() - startTime;
      console.log(
        `[SpeechService] Speech generation completed in ${totalTime}ms`,
      );
      console.log(`[SpeechService] Audio URL: ${url}`);

      return {
        audioUrl: url,
        key,
        duration,
        wordTimings,
        projectId: finalProjectId,
      };
    } catch (error) {
      const totalTime = Date.now() - startTime;
      console.error(
        `[SpeechService] Speech generation failed after ${totalTime}ms:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Get available voices for both providers
   */
  static getAvailableVoices() {
    return VoiceConfigManager.getVoicesByProvider();
  }

  /**
   * Get all voices flattened into a single array
   */
  static getAllVoices() {
    return VoiceConfigManager.getAllVoices();
  }

  /**
   * Find a voice by ID
   */
  static findVoice(voiceId: string) {
    return VoiceConfigManager.findVoice(voiceId);
  }
}
