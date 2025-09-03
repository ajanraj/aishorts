"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
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
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Loading } from "@/components/ui/loading";
import { VideoPlayerPanel } from "@/components/video-editor/video-player-panel";
import { VideoEditorHeader } from "@/components/video-editor/video-editor-header";
import { VideoEditorSidebar } from "@/components/video-editor/sidebar";
import {
  VideoEditorProvider,
  useVideoEditorContext,
  useVideoEditorModals,
} from "@/components/video-editor/providers/video-editor-provider";
import type { VideoSegment } from "@/types/video";
import { ProjectAPI } from "@/lib/project-api";
import { VideoPreviewModal } from "@/components/ui/video-preview-modal";

// Handle segment insertion - this will be passed to the provider
const handleSegmentInsert = async (
  insertAfterIndex: number,
  newSegment: VideoSegment,
  projectId: string,
) => {
  try {
    // Create the new segment via API
    const insertIndex = insertAfterIndex + 1;

    const createdSegmentResponse = await ProjectAPI.createSegment(projectId, {
      order: insertIndex,
      text: newSegment.text,
      imagePrompt: newSegment.imagePrompt,
      duration: newSegment.duration,
      audioVolume: newSegment.audioVolume,
      playBackRate: newSegment.playBackRate,
      withBlur: newSegment.withBlur,
      backgroundMinimized: newSegment.backgroundMinimized,
      wordTimings: newSegment.wordTimings,
    });

    // The provider will handle updating the video data through its internal hooks
    console.log("Segment created successfully:", createdSegmentResponse.data);
  } catch (error) {
    console.error("Failed to insert segment:", error);
    // Show user-friendly error message
    alert(
      `Failed to insert segment: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
};

export default function VideoEditorPage() {
  const params = useParams();
  const videoId = params.id as string;

  const onSegmentInsert = async (
    insertAfterIndex: number,
    newSegment: VideoSegment,
  ) => {
    await handleSegmentInsert(insertAfterIndex, newSegment, videoId);
  };

  return (
    <VideoEditorProvider projectId={videoId} onSegmentInsert={onSegmentInsert}>
      <VideoEditorPageContent />
    </VideoEditorProvider>
  );
}

function VideoEditorPageContent() {
  const router = useRouter();

  // Get state from the provider context
  const { video, isLoading, error } = useVideoEditorContext();
  const { showVideoPreview, exportedVideo, hideVideoPreviewModal } =
    useVideoEditorModals();

  // Loading state
  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center space-y-4">
          <Loading size="lg" />
          <div className="text-lg text-foreground">Loading project...</div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Card className="p-8 text-center">
          <div className="mb-4 text-destructive">
            <AlertCircle className="mx-auto h-12 w-12" />
          </div>
          <h3 className="mb-2 text-lg font-semibold">Failed to load project</h3>
          <p className="mb-4 text-foreground/70">
            {error.message || "Something went wrong while loading the project."}
          </p>
          <div className="flex justify-center gap-2">
            <Button variant="outline" onClick={() => router.push("/dashboard")}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Dashboard
            </Button>
            <Button onClick={() => window.location.reload()}>Try Again</Button>
          </div>
        </Card>
      </div>
    );
  }

  // Video not ready
  if (!video) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center space-y-4">
          <Loading size="lg" />
          <div className="text-lg text-foreground">
            Preparing video editor...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full w-full flex-col bg-white">
      <div className="flex-0 sticky top-0 z-10 bg-white">
        <VideoEditorHeader />
      </div>

      {/* Main Content Area with Sidebar */}
      <div className="flex h-full flex-1">
        {/* Sidebar - rendered by context */}
        <VideoEditorSidebar />

        {/* Main Video Player Area */}
        <div className="flex flex-1 flex-col">
          <VideoPlayerPanel />
        </div>
      </div>

      {/* Video Preview Modal - handled by context */}
      {exportedVideo && (
        <VideoPreviewModal
          isOpen={showVideoPreview}
          onClose={hideVideoPreviewModal}
          videoUrl={exportedVideo.url}
          filename={exportedVideo.filename}
        />
      )}
    </div>
  );
}
