import React from "react";
import { AbsoluteFill } from "remotion";

interface VideoWatermarkProps {
  show: boolean;
}

export const VideoWatermark: React.FC<VideoWatermarkProps> = ({ show }) => {
  if (!show) return null;

  return (
    <AbsoluteFill
      style={{
        display: "flex",
        width: "100%",
        alignItems: "flex-end",
        justifyContent: "flex-start",
        padding: "2rem",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "1rem",
          borderRadius: "9999px",
          backgroundColor: "rgba(255, 255, 255, 0.1)",
          paddingLeft: "1rem",
          paddingRight: "1rem",
          paddingTop: "0.5rem",
          paddingBottom: "0.5rem",
          fontSize: "3rem",
          color: "white",
          backdropFilter: "blur(24px)",
        }}
      >
        <img
          src="https://assets.cursorshorts.com/cursorshorts/assets/images/logo.svg"
          alt="CursorShorts.com"
          style={{
            marginTop: "0.5rem",
            height: "2.5rem",
          }}
        />

        <span>cursorshorts.com</span>
      </div>
    </AbsoluteFill>
  );
};
