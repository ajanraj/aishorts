import React from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { VideoSegment } from "@/types/video";
import { EditSegmentSidebar } from "./edit-segment-sidebar";
import { NewFrameSidebar } from "./new-frame-sidebar";

export type SidebarMode = "edit" | "new" | null;

interface VideoEditorSidebarProps {
  mode: SidebarMode;
  onClose: () => void;
  
  // Edit segment props
  segment?: VideoSegment | null;
  segmentIndex?: number;
  onRegenerateImage?: (
    index: number,
    prompt: string,
    model: string,
  ) => Promise<void>;
  onRegenerateAudio?: (
    index: number,
    script: string,
    voice: string,
  ) => Promise<void>;
  onSegmentUpdate?: (index: number, updatedSegment: VideoSegment) => void;
  isRegenerating?: boolean;
  
  // New frame props
  insertAfterIndex?: number;
  onGenerate?: (script: string, voice: string, imageModel: string) => Promise<void>;
  isGenerating?: boolean;
}

export function VideoEditorSidebar({
  mode,
  onClose,
  segment,
  segmentIndex,
  onRegenerateImage,
  onRegenerateAudio,
  onSegmentUpdate,
  isRegenerating,
  insertAfterIndex,
  onGenerate,
  isGenerating,
}: VideoEditorSidebarProps) {
  if (!mode) return null;

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-80 bg-white border-l border-gray-200 shadow-lg">
      {/* Sidebar Header */}
      <div className="flex items-center justify-between border-b border-gray-200 p-4">
        <h2 className="text-lg font-semibold">
          {mode === "edit" && `Edit Segment #${segmentIndex ?? 0}`}
          {mode === "new" && 
            `Add New Frame${insertAfterIndex !== undefined && insertAfterIndex >= 0 
              ? ` After #${insertAfterIndex}` 
              : " At Beginning"}`
          }
        </h2>
        <Button
          variant="ghost"
          size="sm"
          onClick={onClose}
          className="h-8 w-8 p-0"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Sidebar Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {mode === "edit" && segment && segmentIndex !== undefined && (
          <EditSegmentSidebar
            segment={segment}
            segmentIndex={segmentIndex}
            onRegenerateImage={onRegenerateImage!}
            onRegenerateAudio={onRegenerateAudio!}
            onSegmentUpdate={onSegmentUpdate}
            isRegenerating={isRegenerating ?? false}
            onClose={onClose}
          />
        )}
        
        {mode === "new" && (
          <NewFrameSidebar
            insertAfterIndex={insertAfterIndex ?? -1}
            onGenerate={onGenerate!}
            isGenerating={isGenerating ?? false}
            onClose={onClose}
          />
        )}
      </div>
    </div>
  );
}