import React, { useMemo } from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import type { VideoSegment, CaptionStyle, WordTiming } from "@/types/video";
import type { WordData } from "@/lib/caption-utils";

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
    return {
      displayText: segment.text,
      words: [{ text: segment.text, isActive: true, isCompleted: false }],
    };
  }

  // Find the current active batch from pre-batched word timings
  let currentBatch: WordTiming | null = null;

  for (const batch of segment?.wordTimings) {
    // Check if this batch is active (current time is within batch time range)
    const batchHasStarted = segmentTime >= batch.start;
    const batchIsActive = segmentTime <= batch.end;

    // Check if all previous batches are completed
    const batchIndex = segment?.wordTimings.indexOf(batch);
    const allPreviousBatchesCompleted = segment?.wordTimings
      .slice(0, batchIndex)
      .every((prevBatch) => segmentTime > prevBatch.end);

    if (allPreviousBatchesCompleted && batchHasStarted && batchIsActive) {
      currentBatch = batch;
      break;
    }
  }

  // If no current batch, show the last completed batch or first batch as preview
  if (!currentBatch) {
    const completedBatches = segment?.wordTimings.filter(
      (batch) => segmentTime > batch.end,
    );
    if (completedBatches.length > 0) {
      currentBatch = completedBatches[completedBatches.length - 1];
    } else {
      // Show first batch as preview
      currentBatch = segment.wordTimings[0] || null;
    }
  }

  if (!currentBatch) {
    return {
      displayText: segment.text,
      words: [{ text: segment.text, isActive: false, isCompleted: false }],
    };
  }

  // console.log("thoufic currentBatchwords", currentBatch);
  // Process individual words within the current batch
  const words: WordData[] = currentBatch.words?.map((word) => ({
    text: word.text,
    isActive: segmentTime >= word.start && segmentTime <= word.end,
    isCompleted: segmentTime > word.end,
  }));

  const displayText = currentBatch.text;
  // console.log("thoufic ", {
  //   displayText,
  //   words,
  //   segmentwords: segment.wordTimings,
  //   segmentTime,
  // });

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
    return getCurrentWordsData(segment, captionStyle, segmentTime);
  }, [segment, captionStyle, segmentTime]);

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
        {words?.length > 0 ? (
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
