import { Settings, MoreHorizontal } from "lucide-react";
import type { VideoSegment } from "@/types/video";
import { Button } from "@/components/ui/button";
import { FramesList } from "./frames";
import { EditSegmentDialog, NewFrameDialog } from "./dialogs";
import { VideoEditorSidebar } from "./sidebar";
import { useSegmentOperations } from "./hooks";
import { useEffect, useRef } from "react";

interface VideoFramesPanelProps {
  segments: VideoSegment[];
  selectedFrameIndex: number;
  onFrameSelect: (index: number) => void;
  currentTime: number;
  totalDuration: number;
  projectId?: string;
  onSegmentUpdate?: (index: number, updatedSegment: VideoSegment) => void;
  onSegmentInsert?: (index: number, newSegment: VideoSegment) => void;
  orientation?: "vertical" | "horizontal";
  showHeader?: boolean;
  // Callback to notify parent about sidebar state
  onSidebarStateChange?: (state: {
    mode: any;
    segment: VideoSegment | null;
    segmentIndex: number;
    insertAfterIndex: number;
    isRegenerating: boolean;
    isGenerating: boolean;
    // Handler functions for the sidebar
    onRegenerateImage: (
      index: number,
      prompt: string,
      model: string,
    ) => Promise<void>;
    onRegenerateAudio: (
      index: number,
      script: string,
      voice: string,
    ) => Promise<void>;
    onGenerate: (
      script: string,
      voice: string,
      imageModel: string,
    ) => Promise<void>;
    onClose: () => void;
  }) => void;
}

export function VideoFramesPanel({
  segments,
  selectedFrameIndex,
  onFrameSelect,
  currentTime: _currentTime,
  totalDuration: _totalDuration,
  projectId,
  onSegmentUpdate,
  onSegmentInsert,
  orientation = "vertical",
  showHeader = true,
  onSidebarStateChange,
}: VideoFramesPanelProps) {
  const {
    editingState,
    newFrameState,
    isRegenerating,
    handleEdit,
    handleRegenerateImage,
    handleRegenerateAudio,
    handleCreateNewFrame,
    handleGenerateNewFrame,
    closeEditDialog,
    closeNewFrameDialog,
    // Sidebar state and handlers
    sidebarMode,
    sidebarSegment,
    sidebarSegmentIndex,
    sidebarInsertAfterIndex,
    handleEditSegmentSidebar,
    handleCreateNewFrameSidebar,
    closeSidebar,
  } = useSegmentOperations({
    segments,
    projectId,
    onSegmentUpdate,
    onSegmentInsert,
  });

  const isHorizontal = orientation === "horizontal";

  // Use a ref to track the previous sidebar state to avoid unnecessary updates
  const previousStateRef = useRef<string | null>(null);
  
  // Notify parent about sidebar state changes
  useEffect(() => {
    if (onSidebarStateChange) {
      const currentState = {
        mode: sidebarMode,
        segment: sidebarSegment,
        segmentIndex: sidebarSegmentIndex,
        insertAfterIndex: sidebarInsertAfterIndex,
        isRegenerating: isRegenerating !== null,
        isGenerating: newFrameState?.isGenerating ?? false,
        onRegenerateImage: handleRegenerateImage,
        onRegenerateAudio: handleRegenerateAudio,
        onGenerate: handleGenerateNewFrame,
        onClose: closeSidebar,
      };
      
      // Create a simple state key for comparison (excluding functions)
      const stateKey = JSON.stringify({
        mode: sidebarMode,
        segmentId: sidebarSegment?._id || sidebarSegment?.id,
        segmentIndex: sidebarSegmentIndex,
        insertAfterIndex: sidebarInsertAfterIndex,
        isRegenerating: isRegenerating !== null,
        isGenerating: newFrameState?.isGenerating ?? false,
      });
      
      // Only call the callback if the state actually changed
      if (stateKey !== previousStateRef.current) {
        previousStateRef.current = stateKey;
        onSidebarStateChange(currentState);
      }
    }
  }, [
    sidebarMode,
    sidebarSegment,
    sidebarSegmentIndex,
    sidebarInsertAfterIndex,
    isRegenerating,
    newFrameState?.isGenerating,
    onSidebarStateChange,
    handleRegenerateImage,
    handleRegenerateAudio,
    handleGenerateNewFrame,
    closeSidebar,
  ]);

  return (
    <div className={isHorizontal ? "w-full" : "w-80 border-r bg-white"}>
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
          onFrameSelect={onFrameSelect}
          orientation={orientation}
          onEditFrame={handleEditSegmentSidebar}
          onCreateNewFrame={handleCreateNewFrameSidebar}
          isRegenerating={isRegenerating}
        />
      </div>

      {/* Edit Segment Dialog */}
      <EditSegmentDialog
        isOpen={editingState !== null}
        onClose={closeEditDialog}
        segment={
          editingState && segments[editingState.index]
            ? segments[editingState.index]
            : null
        }
        segmentIndex={editingState?.index ?? -1}
        onRegenerateImage={handleRegenerateImage}
        onRegenerateAudio={handleRegenerateAudio}
        onSegmentUpdate={onSegmentUpdate}
        isRegenerating={isRegenerating !== null}
      />

      {/* New Frame Dialog */}
      <NewFrameDialog
        isOpen={Boolean(newFrameState)}
        onClose={closeNewFrameDialog}
        insertAfterIndex={newFrameState?.insertAfterIndex ?? -1}
        onGenerate={handleGenerateNewFrame}
        isGenerating={newFrameState?.isGenerating ?? false}
      />
    </div>
  );
}
