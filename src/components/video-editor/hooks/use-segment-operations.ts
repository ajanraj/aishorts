import { useState, useEffect, useCallback } from "react";
import { useImageGeneration } from "@/hooks/use-image-generation";
import { getAudioDuration, estimateAudioDuration } from "@/lib/audio-utils";
import type { VideoSegment } from "@/types/video";
import type { SidebarMode } from "../sidebar/video-editor-sidebar";

type EditMode = "image" | "script" | null;

interface EditingState {
  index: number;
  mode: EditMode;
  imagePrompt: string;
  imageModel: string;
  script: string;
  voice: string;
}

interface NewFrameState {
  insertAfterIndex: number;
  script: string;
  voice: string;
  imageModel: string;
  isGenerating: boolean;
}

interface UseSegmentOperationsProps {
  segments: VideoSegment[];
  projectId?: string;
  onSegmentUpdate?: (index: number, updatedSegment: VideoSegment) => void;
  onSegmentInsert?: (index: number, newSegment: VideoSegment) => void;
}

export function useSegmentOperations({
  segments,
  projectId,
  onSegmentUpdate,
  onSegmentInsert,
}: UseSegmentOperationsProps) {
  const [editingState, setEditingState] = useState<EditingState | null>(null);
  const [newFrameState, setNewFrameState] = useState<NewFrameState | null>(
    null,
  );
  const [isRegenerating, setIsRegenerating] = useState<number | null>(null);
  
  // Sidebar state management
  const [sidebarMode, setSidebarMode] = useState<SidebarMode>(null);
  const [sidebarSegment, setSidebarSegment] = useState<VideoSegment | null>(null);
  const [sidebarSegmentIndex, setSidebarSegmentIndex] = useState<number>(-1);
  const [sidebarInsertAfterIndex, setSidebarInsertAfterIndex] = useState<number>(-1);
  
  const { generateImage } = useImageGeneration();

  // Debug: Track editingState changes
  useEffect(() => {
    console.log("useSegmentOperations: editingState changed to:", editingState);
  }, [editingState]);

  const handleEdit = (index: number, segment: VideoSegment) => {
    console.log(
      "useSegmentOperations: handleEdit called with index:",
      index,
      "segment:",
      segment.text.substring(0, 50) + "...",
    );
    console.log(
      "useSegmentOperations: Current editingState before update:",
      editingState,
    );

    const newEditingState = {
      index,
      mode: "image" as EditMode,
      imagePrompt: segment.imagePrompt,
      imageModel: "flux-schnell",
      script: segment.text,
      voice: "echo",
    };

    console.log(
      "useSegmentOperations: Setting new editingState:",
      newEditingState,
    );
    setEditingState(newEditingState);
  };

  // Sidebar handlers
  const handleEditSegmentSidebar = (index: number, segment: VideoSegment) => {
    setSidebarMode("edit");
    setSidebarSegment(segment);
    setSidebarSegmentIndex(index);
    // Also update the old editingState for compatibility
    handleEdit(index, segment);
  };

  const handleCreateNewFrameSidebar = (insertAfterIndex: number) => {
    setSidebarMode("new");
    setSidebarInsertAfterIndex(insertAfterIndex);
    // Also update the old newFrameState for compatibility
    handleCreateNewFrame(insertAfterIndex);
  };

  const closeSidebar = useCallback(() => {
    setSidebarMode(null);
    setSidebarSegment(null);
    setSidebarSegmentIndex(-1);
    setSidebarInsertAfterIndex(-1);
    // Also clear old states for compatibility
    setEditingState(null);
    setNewFrameState(null);
  }, []);

  const handleRegenerateImage = useCallback(async (
    index: number,
    newPrompt: string,
    model: string,
  ) => {
    if (!onSegmentUpdate || !projectId) return;

    setIsRegenerating(index);
    try {
      // Step 1: Generate the new image
      const result = await generateImage({
        prompt: newPrompt,
        model,
      });

      if (result.success && result.imageUrl) {
        const segment = segments[index];
        const segmentId = segment.id || segment._id;

        if (segmentId) {
          // Step 2: Create file record in database
          try {
            const fileResponse = await fetch("/api/files", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                projectId,
                segmentId,
                fileType: "image",
                fileName: `image_${segmentId}_${Date.now()}.jpg`,
                mimeType: "image/jpeg",
                fileSize: 1024, // Size will be determined by the storage service
                sourceUrl: result.imageUrl,
                metadata: {
                  prompt: newPrompt,
                  model,
                  generatedAt: new Date().toISOString(),
                },
              }),
            });

            if (!fileResponse.ok) {
              const error = await fileResponse.json();
              throw new Error(`Failed to create file record: ${error.error}`);
            }

            const fileData = await fileResponse.json();
            console.log("File record created:", fileData);
          } catch (fileError) {
            console.warn(
              "Failed to create file record, but continuing with segment update:",
              fileError,
            );
          }
        }

        // Step 3: Update the segment
        const updatedSegment: VideoSegment = {
          ...segments[index],
          imagePrompt: newPrompt,
          imageUrl: result.imageUrl,
        };
        onSegmentUpdate(index, updatedSegment);
      } else {
        // eslint-disable-next-line no-console
        console.error("Failed to regenerate image:", result.error);
        // eslint-disable-next-line no-alert
        alert(`Failed to regenerate image: ${result.error}`);
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error("Error regenerating image:", error);
      // eslint-disable-next-line no-alert
      alert("Error regenerating image. Please try again.");
    } finally {
      setIsRegenerating(null);
      // setEditingState(null);
    }
  }, [segments, projectId, onSegmentUpdate, generateImage]);

  const handleRegenerateAudio = useCallback(async (
    index: number,
    newScript: string,
    voice: string,
  ) => {
    if (!onSegmentUpdate || !projectId) return;

    setIsRegenerating(index);
    try {
      // Step 1: Generate the new audio
      const response = await fetch("/api/text-to-speech", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: newScript,
          voice: voice,
          index: index,
        }),
      });

      if (response.ok) {
        const { audioUrl } = await response.json();

        // Get actual audio duration
        let actualDuration: number;
        try {
          actualDuration = await getAudioDuration(audioUrl);
        } catch (error) {
          // eslint-disable-next-line no-console
          console.warn(
            `Could not get actual duration for segment ${index}, using estimate:`,
            error,
          );
          actualDuration = estimateAudioDuration(newScript);
        }

        const segment = segments[index];
        const segmentId = segment.id || segment._id;

        if (segmentId) {
          // Step 2: Create file record in database
          try {
            const fileResponse = await fetch("/api/files", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                projectId,
                segmentId,
                fileType: "audio",
                fileName: `audio_${segmentId}_${Date.now()}.mp3`,
                mimeType: "audio/mpeg",
                fileSize: 0, // Size will be determined by the storage service
                sourceUrl: audioUrl,
                metadata: {
                  text: newScript,
                  voice,
                  duration: actualDuration,
                  generatedAt: new Date().toISOString(),
                },
              }),
            });

            if (!fileResponse.ok) {
              const error = await fileResponse.json();
              throw new Error(`Failed to create file record: ${error.error}`);
            }

            const fileData = await fileResponse.json();
            console.log("File record created:", fileData);
          } catch (fileError) {
            console.warn(
              "Failed to create file record, but continuing with segment update:",
              fileError,
            );
          }
        }

        // Step 3: Update the segment
        const updatedSegment: VideoSegment = {
          ...segments[index],
          text: newScript,
          audioUrl: audioUrl,
          duration: actualDuration,
        };
        onSegmentUpdate(index, updatedSegment);
      } else {
        const error = await response.json();
        // eslint-disable-next-line no-alert
        alert(`Failed to regenerate audio: ${error.error}`);
      }
    } catch (error) {
      console.error("Error regenerating audio:", error);
      alert("Error regenerating audio. Please try again.");
    } finally {
      setIsRegenerating(null);
      // setEditingState(null);
    }
  }, [segments, projectId, onSegmentUpdate]);

  // Generate image prompt from script
  const generateImagePrompt = async (script: string): Promise<string> => {
    try {
      const response = await fetch("/api/generate-image-prompt", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: script,
          style: "dark_eerie_survival", // Use the existing style
        }),
      });

      if (response.ok) {
        const { imagePrompt } = await response.json();
        return imagePrompt;
      } else {
        console.error("Failed to generate image prompt");
        return `Dark, eerie scene representing: ${script}`;
      }
    } catch (error) {
      console.error("Error generating image prompt:", error);
      return `Dark, eerie scene representing: ${script}`;
    }
  };

  // Handle new frame creation
  const handleCreateNewFrame = (insertAfterIndex: number) => {
    setNewFrameState({
      insertAfterIndex,
      script: "",
      voice: "echo",
      imageModel: "flux-schnell",
      isGenerating: false,
    });
  };

  // Count words in script
  const countWords = (text: string): number => {
    return text.trim() === "" ? 0 : text.trim().split(/\s+/).length;
  };

  // Generate new frame with all assets
  const handleGenerateNewFrame = useCallback(async (
    script: string,
    voice: string,
    imageModel: string,
  ) => {
    if (!newFrameState || !onSegmentInsert) return;

    // Validate script length (max 50 words)
    const wordCount = countWords(script);
    if (wordCount > 50) {
      alert("Script must be 50 words or less. Current count: " + wordCount);
      return;
    }

    if (!script.trim()) {
      alert("Please enter a script for the new frame.");
      return;
    }

    setNewFrameState((prev) => (prev ? { ...prev, isGenerating: true } : null));

    try {
      // Step 1: Generate image prompt
      const imagePrompt = await generateImagePrompt(script);

      // Step 2: Generate image
      const imageResult = await generateImage({
        prompt: imagePrompt,
        model: imageModel,
      });

      if (!imageResult.success) {
        throw new Error("Failed to generate image: " + imageResult.error);
      }

      // Step 3: Generate audio
      const audioResponse = await fetch("/api/text-to-speech", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: script,
          voice: voice,
          index: newFrameState.insertAfterIndex + 1,
        }),
      });

      if (!audioResponse.ok) {
        const error = await audioResponse.json();
        throw new Error("Failed to generate audio: " + error.error);
      }

      const { audioUrl } = await audioResponse.json();

      // Get actual audio duration
      let actualDuration: number;
      try {
        actualDuration = await getAudioDuration(audioUrl);
      } catch (error) {
        console.warn("Could not get actual duration, using estimate:", error);
        actualDuration = estimateAudioDuration(script);
      }

      // Step 4: Create new segment
      const newSegment: VideoSegment = {
        _id: `segment_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
        text: script,
        imagePrompt: imagePrompt,
        imageUrl: imageResult.imageUrl!,
        audioUrl: audioUrl,
        audioVolume: 1,
        playBackRate: 1,
        duration: actualDuration,
        withBlur: false,
        backgroundMinimized: false,
        order: newFrameState.insertAfterIndex + 1,
        media: [],
        wordTimings: [],
        elements: [],
      };

      // Step 5: Insert new segment
      onSegmentInsert(newFrameState.insertAfterIndex, newSegment);

      // Close modal
      setNewFrameState(null);
    } catch (error) {
      console.error("Error creating new frame:", error);
      alert("Error creating new frame: " + (error as Error).message);
    } finally {
      setNewFrameState((prev) =>
        prev ? { ...prev, isGenerating: false } : null,
      );
    }
  }, [newFrameState, onSegmentInsert, generateImage]);

  const closeEditDialog = () => {
    console.log(
      "useSegmentOperations: closeEditDialog called - clearing editingState",
    );
    setEditingState(null);
  };

  const closeNewFrameDialog = () => {
    setNewFrameState(null);
  };

  return {
    // Legacy dialog state (for backward compatibility)
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
  };
}
