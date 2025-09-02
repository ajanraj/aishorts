import React from "react";
import { AbsoluteFill } from "remotion";

interface VideoWatermarkProps {
  show: boolean;
}

export const VideoWatermark: React.FC<VideoWatermarkProps> = ({ show }) => {
  if (!show) return null;

  return (
    <AbsoluteFill className="flex w-full items-start justify-end p-8">
      <div className="align-center flex gap-4 rounded-full bg-white/50 px-4 text-5xl text-white backdrop-blur-sm">
        <span style={{ color: "#fbbf24" }}>
          <img src="/logo.svg" alt="CursorShorts.com" className="h-10" />
        </span>
        <span>cursorhorts.com</span>
      </div>
    </AbsoluteFill>
  );
};
