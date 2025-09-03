import React from "react";
import { AbsoluteFill } from "remotion";

interface VideoWatermarkProps {
  show: boolean;
}

export const VideoWatermark: React.FC<VideoWatermarkProps> = ({ show }) => {
  if (!show) return null;

  return (
    <AbsoluteFill className="flex w-full items-end justify-start p-8">
      <div className="align-center flex justify-center gap-4 rounded-full bg-white/10 px-4 py-2 text-5xl text-white backdrop-blur-xl">
        <img
          src="https://assets.cursorshorts.com/cursorshorts/assets/images/logo.svg"
          alt="CursorShorts.com"
          className="mt-2 h-[2.5rem]"
        />

        <span>cursorshorts.com</span>
      </div>
    </AbsoluteFill>
  );
};
