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
      <div className="relative max-h-[90vh] w-full max-w-4xl overflow-hidden rounded-lg bg-white shadow-xl">
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
          <div className="relative overflow-hidden rounded-lg bg-black">
            <video
              ref={videoRef}
              src={videoUrl}
              controls
              className="h-full max-h-[50vh] w-full object-contain"
              preload="metadata"
            >
              Your browser does not support the video tag.
            </video>
          </div>
          {/* Download Instructions */}
          <div className="mt-6 flex flex-col">
            <h3 className="text-lg font-semibold">Download Instructions</h3>
            <ol>
              <li className="mb-2">
                1. Click on the menu icon in the bottom right corner of the
                video player
              </li>
              <li className="mb-2">2. Click on "Download" </li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
}
