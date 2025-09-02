"use client";

import { useRef } from "react";
import { X, Download } from "lucide-react";
import { Button } from "@/components/ui/button";

interface VideoPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  videoUrl: string;
  filename?: string;
}

export function VideoPreviewModal({
  isOpen,
  onClose,
  videoUrl,
  filename = "video.mp4",
}: VideoPreviewModalProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  if (!isOpen) return null;

  const handleDownload = () => {
    if (videoRef.current) {
      // Use the video element's download capability
      const link = document.createElement("a");
      link.href = videoUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="relative w-full max-w-4xl max-h-[90vh] overflow-hidden rounded-lg bg-white shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b p-4">
          <h2 className="text-lg font-semibold">Video Preview</h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-8 w-8 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Video Content */}
        <div className="p-6">
          <div className="relative aspect-[9/16] max-h-[60vh] overflow-hidden rounded-lg bg-black">
            <video
              ref={videoRef}
              src={videoUrl}
              controls
              className="h-full w-full object-contain"
              preload="metadata"
            >
              Your browser does not support the video tag.
            </video>
          </div>

          {/* Download Button */}
          <div className="mt-6 flex justify-center">
            <Button
              onClick={handleDownload}
              className="flex items-center gap-2 px-6 py-3"
              size="lg"
            >
              <Download className="h-5 w-5" />
              Download Video
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}