import React, { useMemo } from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import type { VideoSegment, CaptionStyle } from "@/types/video";
import type { WordData } from "@/lib/caption-utils";

interface WordBatch {
  text: string;
  start: number;
  end: number;
  words: WordData[];
}

const getCurrentWordsData = (
  segment: VideoSegment,
  captionStyle: CaptionStyle,
  segmentTime: number,
): {
  displayText: string;
  words: WordData[];
} => {
  // If no word timings, show the entire segment text
  if (!segment.wordTimings || segment.wordTimings.length === 0) {
    console.log("segment-caption getCurrentWordsData no wordtimings", {
      displayText: segment.text,
      words: [{ text: segment.text, isActive: true, isCompleted: false }],
    });
    return {
      displayText: segment.text,
      words: [{ text: segment.text, isActive: true, isCompleted: false }],
    };
  }

  // Flatten all words from word timings - these are already segment-relative (0-based)
  let allWords: Array<{ text: string; start: number; end: number }> = [];
  console.log("thoufic timing", segment.wordTimings);
  for (const timing of segment.wordTimings[0]) {
    allWords.push({
      text: timing.word,
      start: timing.start,
      end: timing.end,
    });
  }

  // Sort words by start time to ensure proper order
  allWords.sort((a, b) => a.start - b.start);
  console.log("thoufic allwords", allWords);

  // Create stable word batches based on wordsPerBatch setting
  const wordsPerBatch = captionStyle.wordsPerBatch || 1;
  const batches: WordBatch[] = [];

  for (let i = 0; i < allWords.length; i += wordsPerBatch) {
    const batchWords = allWords.slice(i, i + wordsPerBatch);
    const batchText = batchWords.map((w) => w.text).join(" ");
    const batchStart = batchWords[0].start;
    const batchEnd = batchWords[batchWords.length - 1].end;

    batches.push({
      text: batchText,
      start: batchStart,
      end: batchEnd,
      words: batchWords.map((word) => ({
        text: word.text,
        isActive: segmentTime >= word.start && segmentTime <= word.end,
        isCompleted: segmentTime > word.end,
      })),
    });
  }

  // Find the current active batch - only show batch if ALL words in previous batches are completed
  let currentBatch: WordBatch | null = null;

  for (const batch of batches) {
    const allPreviousBatchesCompleted = batches
      .slice(0, batches.indexOf(batch))
      .every((prevBatch) => segmentTime > prevBatch.end);

    const batchHasStarted = segmentTime >= batch.start;
    const batchIsActive = segmentTime <= batch.end;

    if (allPreviousBatchesCompleted && batchHasStarted && batchIsActive) {
      currentBatch = batch;
      break;
    }
  }

  // If no current batch, show the last completed batch or first batch as preview
  if (!currentBatch) {
    const completedBatches = batches.filter((batch) => segmentTime > batch.end);
    if (completedBatches.length > 0) {
      currentBatch = completedBatches[completedBatches.length - 1];
      // Mark all words as completed for display
      currentBatch = {
        ...currentBatch,
        words: currentBatch.words.map((word) => ({
          ...word,
          isCompleted: true,
          isActive: false,
        })),
      };
    } else {
      // Show first batch as preview
      currentBatch = batches[0] || null;
      if (currentBatch) {
        currentBatch = {
          ...currentBatch,
          words: currentBatch.words.map((word) => ({
            ...word,
            isActive: false,
            isCompleted: false,
          })),
        };
      }
    }
  }

  const displayText = currentBatch?.text || "";
  const words = currentBatch?.words || [];

  console.log("segment-caption getCurrentWordsData", {
    displayText,
    words,
    currentBatch,
    segmentTime,
  });

  return { displayText, words };
};

interface SegmentCaptionProps {
  segment: VideoSegment;
  captionStyle: CaptionStyle;
  fps: number;
}

export const SegmentCaption: React.FC<SegmentCaptionProps> = ({
  segment,
  captionStyle,
  fps,
}) => {
  const frame = useCurrentFrame(); // This is segment-relative within Sequence context
  const segmentTime = useMemo(() => frame / fps, [frame, fps]); // Convert frame to seconds within this segment

  const { displayText, words } = useMemo(() => {
    console.log("thoufic ", { segment, captionStyle, segmentTime });
    return getCurrentWordsData(segment, captionStyle, segmentTime);
  }, [segment, captionStyle, segmentTime]);
  console.log("thoufic segment-captions", { displayText, words });

  return (
    <AbsoluteFill
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 60,
        paddingBottom: `${captionStyle.fromBottom}%`,
        pointerEvents: "none", // Prevent interaction with caption layer
      }}
    >
      <CaptionContainer captionStyle={captionStyle}>
        {words.length > 0 ? (
          <WordRenderer words={words} captionStyle={captionStyle} />
        ) : (
          <span
            style={{
              color: captionStyle.activeWordColor,
            }}
          >
            {displayText}
          </span>
        )}
      </CaptionContainer>
    </AbsoluteFill>
  );
};

interface CaptionContainerProps {
  children: React.ReactNode;
  captionStyle: CaptionStyle;
}

const CaptionContainer: React.FC<CaptionContainerProps> = ({
  children,
  captionStyle,
}) => {
  return (
    <div
      style={{
        fontSize: captionStyle.fontSize,
        fontWeight: captionStyle.fontWeight,
        fontFamily: captionStyle.fontFamily,
        textAlign: "center",
        textShadow: captionStyle.textShadow,
        textTransform: captionStyle.textTransform as any,
        backgroundColor: captionStyle.backgroundColor,
        lineHeight: 1.3,
        maxWidth: "90%",
        padding:
          captionStyle.backgroundColor !== "transparent" ? "16px 32px" : "0",
        borderRadius:
          captionStyle.backgroundColor !== "transparent" ? "12px" : "0",
        display: "flex",
        flexWrap: "wrap",
        gap: "0.3em",
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      {children}
    </div>
  );
};

interface WordRendererProps {
  words: WordData[];
  captionStyle: CaptionStyle;
}

const WordRenderer: React.FC<WordRendererProps> = ({ words, captionStyle }) => {
  return (
    <>
      {words.map((word, index) => (
        <WordSpan key={index} word={word} captionStyle={captionStyle} />
      ))}
    </>
  );
};

interface WordSpanProps {
  word: WordData;
  captionStyle: CaptionStyle;
}

const WordSpan: React.FC<WordSpanProps> = ({ word, captionStyle }) => {
  return (
    <span
      style={{
        color: word.isActive
          ? captionStyle.activeWordColor
          : word.isCompleted
            ? captionStyle.activeWordColor
            : captionStyle.inactiveWordColor,
        opacity: word.isCompleted ? 0.85 : word.isActive ? 1 : 0.6,
        display: "inline-block",
        textShadow: word.isActive
          ? `${captionStyle.textShadow}, 0 0 25px ${captionStyle.activeWordColor}60, 0 0 40px ${captionStyle.activeWordColor}30`
          : captionStyle.textShadow,
        filter: word.isActive ? "brightness(1.2)" : "brightness(1)",
        fontWeight: word.isActive ? "900" : captionStyle.fontWeight,
      }}
    >
      {word.text}
    </span>
  );
};
