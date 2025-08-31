import type { Video, CaptionStyle } from "@/types/video";

/**
 * Utility function to get caption style from video configuration
 * Extracted from use-caption-data hook for reuse in segment-level captions
 */
export const getCaptionStyle = (video: Video): CaptionStyle => {
  const captionLayer = video.layers.find((layer) => layer.type === "captions");

  if (captionLayer) {
    return captionLayer.captionStyle;
  }

  // Default caption style - matches original implementation
  return {
    fontSize: 75,
    fontFamily: "Inter",
    activeWordColor: "#FFFFFF",
    inactiveWordColor: "#CCCCCC",
    backgroundColor: "transparent",
    fontWeight: "700",
    textTransform: "none",
    textShadow:
      ".1em .1em .1em #000,.1em -.1em .1em #000,-.1em .1em .1em #000,-.1em -.1em .1em #000,.1em .1em .2em #000,.1em -.1em .2em #000,-.1em .1em .2em #000,-.1em -.1em .2em #000,0 0 .1em #000,0 0 .2em #000,0 0 .3em #000,0 0 .4em #000,0 0 .5em #000,0 0 .6em #000",
    wordAnimation: [], // Added missing property from CaptionStyle interface
    showEmojis: true,
    fromBottom: 49,
    wordsPerBatch: 1,
  };
};

/**
 * Interface for word data used in caption rendering
 */
export interface WordData {
  text: string;
  isActive: boolean;
  isCompleted: boolean;
}

/**
 * Checks if captions should be rendered for a video
 * Based on the presence of a captions layer
 */
export const shouldRenderCaptions = (video: Video): boolean => {
  return video.layers.some((layer) => layer.type === "captions");
};
