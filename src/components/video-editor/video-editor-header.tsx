"use client";

import {
  ArrowLeft,
  Layers,
  Settings,
  AlignLeft,
  Copy,
  Edit3,
  MoreHorizontal,
  Download,
  Share,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { useRouter } from "next/navigation";
import { VideoPreviewModal } from "@/components/ui/video-preview-modal";
import {
  useVideoEditorContext,
  useVideoEditorPlayer,
  useVideoEditorExport,
  useVideoEditorModals,
  useVideoEditorOperations,
} from "./providers/video-editor-provider";

interface VideoEditorHeaderProps {
  className?: string;
}

export function VideoEditorHeader({ className }: VideoEditorHeaderProps = {}) {
  const router = useRouter();

  // Get state from context
  const { video } = useVideoEditorContext();
  const { currentTime, totalDuration } = useVideoEditorPlayer();
  const { isExporting, exportProgress, exportVideo } = useVideoEditorExport();
  const { showVideoPreview, exportedVideo, hideVideoPreviewModal } =
    useVideoEditorModals();
  const { updateVideo } = useVideoEditorOperations();

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const handleExport = async (quality: string) => {
    try {
      await exportVideo(quality);
    } catch (error) {
      console.error("Export failed:", error);
      alert(
        `Export failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  };

  const handleWatermarkToggle = async () => {
    if (!video) return;

    try {
      await updateVideo({ watermark: !video.watermark });
    } catch (error) {
      console.error("Failed to toggle watermark:", error);
      alert(
        `Failed to update watermark: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  };

  return (
    <>
      <header
        className={`flex h-14 items-center justify-between border-b bg-white px-4 ${className || ""}`}
      >
        <div className="flex items-center gap-4">
          <Button
            variant="link"
            size="sm"
            className="flex items-center gap-2 text-gray-600"
            onClick={() => router.push("/dashboard")}
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to videos</span>
          </Button>
        </div>

        <div className="flex items-center gap-2">
          {/* Left side buttons */}
          {/* <Button variant="ghost" size="sm" className="flex items-center gap-2">
          <Layers className="h-4 w-4" />
          <span>Frames</span>
        </Button>

        <Button variant="ghost" size="sm" className="flex items-center gap-2">
          <Settings className="h-4 w-4" />
          <span>Actions</span>
        </Button>

        <Button variant="ghost" size="sm" className="flex items-center gap-2">
          <AlignLeft className="h-4 w-4" />
          <span>Audio</span>
        </Button> */}

          {/* Center - Time display */}
          <div className="mx-8 flex items-center gap-2 text-sm">
            <span className="font-mono">
              {formatTime(currentTime)} / {formatTime(totalDuration)}
            </span>
          </div>

          {/* Right side buttons */}
          <Button variant="ghost" size="sm">
            <Copy className="h-4 w-4" />
          </Button>

          {/* Watermark toggle */}
          <Badge
            variant="secondary"
            className={`cursor-pointer transition-colors ${
              video?.watermark
                ? "bg-green-100 text-green-800 hover:bg-green-200"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
            onClick={handleWatermarkToggle}
          >
            {video?.watermark ? "Watermark ON" : "Watermark OFF"}
          </Badge>

          {/* Export/Share buttons */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="flex items-center gap-2"
                disabled={isExporting}
              >
                {isExporting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>{exportProgress || "Exporting..."}</span>
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4" />
                    <span>Export / Share</span>
                  </>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-">
              <DropdownMenuItem
                onClick={() => handleExport("low")}
                disabled={isExporting || !video}
              >
                <Download className="mr-2 h-4 w-4" />
                Export Low Quality
                <span>
                  <Badge variant="secondary" className="ml-auto text-xs">
                    Fast
                  </Badge>
                </span>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => handleExport("medium")}
                disabled={isExporting || !video}
              >
                <Download className="mr-2 h-4 w-4" />
                Export Medium Quality
                <Badge variant="secondary" className="ml-auto text-xs">
                  Recommended
                </Badge>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => handleExport("high")}
                disabled={isExporting || !video}
              >
                <Download className="mr-2 h-4 w-4" />
                Export High Quality
                <Badge variant="secondary" className="ml-auto text-xs">
                  Slow
                </Badge>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem disabled>
                <Share className="mr-2 h-4 w-4" />
                Share (Coming Soon)
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* Video Preview Modal */}
      {exportedVideo && (
        <VideoPreviewModal
          isOpen={showVideoPreview}
          onClose={hideVideoPreviewModal}
          videoUrl={exportedVideo.url}
          filename={exportedVideo.filename}
        />
      )}
    </>
  );
}
