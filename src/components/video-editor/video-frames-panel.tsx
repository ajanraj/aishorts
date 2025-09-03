import { Settings, MoreHorizontal } from "lucide-react";
import type { VideoSegment } from "@/types/video";
import { Button } from "@/components/ui/button";
import { FramesList } from "./frames";
import {
  useVideoEditorContext,
  useVideoEditorPlayer,
  useVideoEditorSidebar,
} from "./providers/video-editor-provider";

interface VideoFramesPanelProps {
  orientation?: "vertical" | "horizontal";
  showHeader?: boolean;
  className?: string;
}

export function VideoFramesPanel({
  orientation = "vertical",
  showHeader = true,
  className,
}: VideoFramesPanelProps) {
  // Get state from context
  const { video } = useVideoEditorContext();
  const { selectedFrameIndex, selectFrame } = useVideoEditorPlayer();
  const { openEditSidebar, openNewSegmentSidebar } = useVideoEditorSidebar();

  if (!video) return null;

  const segments = video.segments;

  const isHorizontal = orientation === "horizontal";

  const handleEditFrame = (index: number) => {
    const segment = segments[index];
    if (segment) {
      openEditSidebar(segment, index);
    }
  };

  const handleCreateNewFrame = (insertAfterIndex: number) => {
    openNewSegmentSidebar(insertAfterIndex);
  };

  return (
    <div
      className={`${isHorizontal ? "w-full" : "h-full w-64"} ${className || ""}`}
    >
      {/* Header */}
      {showHeader && (
        <div
          className={`flex items-center justify-between ${
            isHorizontal ? "border-b p-4" : "h-14 border-b px-4"
          }`}
        >
          <h2 className="text-sm font-medium">
            {isHorizontal ? "Segments" : "Frames"}
          </h2>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm">
              <Settings className="size-4" />
            </Button>
            <Button variant="ghost" size="sm">
              <MoreHorizontal className="size-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Frames list */}
      <div
        className={
          isHorizontal ? "overflow-x-auto p-4" : "flex-1 overflow-y-auto p-4"
        }
      >
        <FramesList
          segments={segments}
          selectedFrameIndex={selectedFrameIndex}
          onFrameSelect={selectFrame}
          orientation={orientation}
          onEditFrame={handleEditFrame}
          onCreateNewFrame={handleCreateNewFrame}
          isRegenerating={null} // This will be handled by the context/sidebar
        />
      </div>
    </div>
  );
}
