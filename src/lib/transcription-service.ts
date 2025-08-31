import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

// TypeScript interface for word timing data
export interface WordTiming {
  word: string;
  start: number;
  end: number;
}

// TypeScript interface for the transcription response
export interface TranscriptionResult {
  text: string;
  words: WordTiming[];
  duration: number;
}

export class TranscriptionService {
  /**
   * Transcribe audio buffer and extract word-level timestamps
   */
  static async transcribeAudio(audioBuffer: Buffer): Promise<TranscriptionResult> {
    try {
      // Convert buffer to file-like object for OpenAI API
      const audioFile = new File([audioBuffer], "audio.mp3", {
        type: "audio/mpeg",
      });

      // Call OpenAI transcription API with word-level timestamps
      const transcription = await openai.audio.transcriptions.create({
        file: audioFile,
        model: "whisper-1",
        response_format: "verbose_json",
        timestamp_granularities: ["word"],
      });

      // Extract word timings from the response
      const words: WordTiming[] = transcription.words?.map((word: any) => ({
        word: word.word,
        start: word.start,
        end: word.end,
      })) || [];

      return {
        text: transcription.text,
        words,
        duration: transcription.duration || 0,
      };
    } catch (error) {
      console.error("Error transcribing audio:", error);
      throw new Error(
        `Failed to transcribe audio: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  /**
   * Transcribe audio from URL (fetch and transcribe)
   */
  static async transcribeAudioFromUrl(audioUrl: string): Promise<TranscriptionResult> {
    try {
      // Fetch the audio file
      const response = await fetch(audioUrl);
      if (!response.ok) {
        throw new Error(`Failed to fetch audio: ${response.statusText}`);
      }

      // Convert to buffer
      const audioBuffer = Buffer.from(await response.arrayBuffer());

      // Transcribe the buffer
      return await this.transcribeAudio(audioBuffer);
    } catch (error) {
      console.error("Error transcribing audio from URL:", error);
      throw new Error(
        `Failed to transcribe audio from URL: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  /**
   * Validate word timings data structure
   */
  static validateWordTimings(wordTimings: any): wordTimings is WordTiming[] {
    if (!Array.isArray(wordTimings)) {
      return false;
    }

    return wordTimings.every(
      (item) =>
        typeof item === "object" &&
        item !== null &&
        typeof item.word === "string" &&
        typeof item.start === "number" &&
        typeof item.end === "number" &&
        item.start >= 0 &&
        item.end >= item.start
    );
  }

  /**
   * Get total duration from word timings
   */
  static getTotalDurationFromWordTimings(wordTimings: WordTiming[]): number {
    if (wordTimings.length === 0) {
      return 0;
    }

    const lastWord = wordTimings[wordTimings.length - 1];
    return lastWord.end;
  }

  /**
   * Get words within a specific time range
   */
  static getWordsInTimeRange(
    wordTimings: WordTiming[],
    startTime: number,
    endTime: number
  ): WordTiming[] {
    return wordTimings.filter(
      (word) => word.start >= startTime && word.end <= endTime
    );
  }

  /**
   * Combine multiple word timing arrays (useful for multi-segment videos)
   */
  static combineWordTimings(
    wordTimingsArray: WordTiming[][],
    segmentDurations: number[]
  ): WordTiming[] {
    const combined: WordTiming[] = [];
    let currentOffset = 0;

    wordTimingsArray.forEach((wordTimings, index) => {
      const offsetWords = wordTimings.map((word) => ({
        word: word.word,
        start: word.start + currentOffset,
        end: word.end + currentOffset,
      }));

      combined.push(...offsetWords);
      currentOffset += segmentDurations[index] || 0;
    });

    return combined;
  }

  /**
   * Convert word timings to subtitles format (SRT-like)
   */
  static wordTimingsToSubtitles(
    wordTimings: WordTiming[],
    wordsPerLine: number = 3
  ): Array<{ start: number; end: number; text: string }> {
    const subtitles: Array<{ start: number; end: number; text: string }> = [];
    
    for (let i = 0; i < wordTimings.length; i += wordsPerLine) {
      const wordsGroup = wordTimings.slice(i, i + wordsPerLine);
      if (wordsGroup.length === 0) continue;

      const start = wordsGroup[0].start;
      const end = wordsGroup[wordsGroup.length - 1].end;
      const text = wordsGroup.map((w) => w.word.trim()).join(" ");

      subtitles.push({ start, end, text });
    }

    return subtitles;
  }

  /**
   * Convert flat word timings to batched structure for video captions
   */
  static convertToWordBatches(
    wordTimings: WordTiming[],
    wordsPerBatch: number = 3
  ): Array<{
    text: string;
    start: number;
    end: number;
    words: Array<{
      text: string;
      start: number;
      end: number;
    }>;
  }> {
    const batches: Array<{
      text: string;
      start: number;
      end: number;
      words: Array<{
        text: string;
        start: number;
        end: number;
      }>;
    }> = [];
    
    for (let i = 0; i < wordTimings.length; i += wordsPerBatch) {
      const wordsGroup = wordTimings.slice(i, i + wordsPerBatch);
      if (wordsGroup.length === 0) continue;

      const batchText = wordsGroup.map((w) => w.word.trim()).join(" ");
      const batchStart = wordsGroup[0].start;
      const batchEnd = wordsGroup[wordsGroup.length - 1].end;
      
      const batchWords = wordsGroup.map((word) => ({
        text: word.word,
        start: word.start,
        end: word.end,
      }));

      batches.push({
        text: batchText,
        start: batchStart,
        end: batchEnd,
        words: batchWords,
      });
    }

    return batches;
  }
}