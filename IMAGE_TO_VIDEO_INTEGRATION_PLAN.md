# Fal.ai Image-to-Video Integration Plan

## Overview
Integrate Fal.ai's image-to-video model into the EditSegmentDialog to allow users to convert generated images into videos that will be uploaded to R2 and added to the segment's files array as video file records.

## Current Architecture Analysis

### Existing Components
- **EditSegmentDialog**: Main dialog component with tab navigation (image/script tabs)
- **FalAI Service**: Already has `generateVideo()` method implemented
- **R2 Storage**: Organized file storage with folder structure
- **File Management API**: Endpoints for file upload and management
- **Video Segments**: Support files array with ProjectFile objects

### Existing File Structure
```
src/components/video-editor/dialogs/
├── edit-segment-dialog.tsx (main dialog)
├── tabs/
│   ├── index.ts
│   ├── tab-navigation.tsx
│   ├── image-edit-tab.tsx
│   └── script-edit-tab.tsx
```

## Implementation Plan

### 1. API Endpoint Creation
**File**: `src/app/api/generate-video/route.ts`

**Purpose**: Handle image-to-video generation requests

**Functionality**:
- Accept POST requests with `{ projectId, segmentId, imageUrl, prompt? }`
- Use FalAI service to generate video from image
- Upload generated video to R2 storage
- Create file record in database with `fileType: 'video'`
- Return updated segment data with new video file

**Request Body**:
```json
{
  "projectId": "string",
  "segmentId": "string", 
  "imageUrl": "string",
  "prompt": "string (optional)",
  "motionBucketId": 127,
  "fps": 8,
  "numFrames": 25
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "fileId": "string",
    "videoUrl": "string",
    "r2Key": "string"
  }
}
```

### 2. Video Tab Component
**File**: `src/components/video-editor/dialogs/tabs/video-edit-tab.tsx`

**Features**:
- Display current video if exists in segment.files (fileType: 'video')
- Show video preview with play controls
- "Generate Video from Image" button when image exists
- Video generation parameters form
- Loading states and error handling
- Progress indicators

**Props Interface**:
```typescript
interface VideoEditTabProps {
  segment: VideoSegment;
  onGenerateVideo: (params: VideoGenParams) => Promise<void>;
  isGeneratingVideo: boolean;
}
```

**UI Layout**:
```
[Video Preview Section]          [Controls Section]
- Current video player           - Generate Video button
- Video metadata display         - Motion intensity slider
- Generation status             - Duration settings
                                - Advanced options
```

### 3. Tab Navigation Update
**File**: `src/components/video-editor/dialogs/tabs/tab-navigation.tsx`

**Changes**:
- Add "video" tab option
- Update tab type: `type TabType = "image" | "script" | "video"`
- Add video icon and label

### 4. Dialog Integration
**File**: `src/components/video-editor/dialogs/edit-segment-dialog.tsx`

**Updates**:
- Add `activeTab` support for "video"
- Add `onGenerateVideo` prop and handler
- Add `isGeneratingVideo` state
- Include VideoEditTab component
- Update EditMode type definition

**New Props**:
```typescript
interface EditSegmentDialogProps {
  // ... existing props
  onGenerateVideo?: (segmentIndex: number, params: VideoGenParams) => Promise<void>;
  isGeneratingVideo?: boolean;
}
```

### 5. Type System Updates
**File**: `src/types/video.ts`

**No changes needed** - VideoSegment.files array already supports video files via ProjectFile interface with `fileType: 'video'`

### 6. R2 Storage Enhancement
**File**: `src/lib/r2-storage.ts`

**Add method**:
```typescript
static async uploadVideo(
  buffer: Buffer,
  userId: string,
  projectId: string,
  segmentId: string,
  filename: string
): Promise<{key: string, url: string}>
```

**Folder structure**: `{userId}/{projectId}/{segmentId}/video/{filename}`

### 7. FalAI Service Updates
**File**: `src/lib/falai-service.ts`

**Current Status**: `generateVideo()` method already implemented
**Potential Updates**:
- Add better error handling
- Support additional parameters
- Add video quality options

## Implementation Workflow

### Phase 1: Backend Infrastructure
1. Create `/api/generate-video` endpoint
2. Enhance R2Storage with video upload method
3. Test video generation and storage pipeline

### Phase 2: UI Components  
1. Create VideoEditTab component
2. Update TabNavigation component
3. Integrate video tab into EditSegmentDialog

### Phase 3: Integration & Testing
1. Connect frontend to backend API
2. Handle loading states and errors
3. Test complete video generation flow
4. Update parent components to handle video generation

## User Experience Flow

```
1. User opens EditSegmentDialog
2. User clicks "Video" tab
3. If segment has image:
   - Show "Generate Video" button
   - User clicks button
   - Show loading state with progress
   - Video generates and uploads to R2
   - New video file added to segment.files
   - Video preview appears in tab
4. If segment has existing video:
   - Show video player with current video
   - Option to regenerate or replace
```

## File Management Integration

### Storage Pattern
Generated videos stored as ProjectFile objects:
```typescript
{
  id: "uuid",
  fileType: "video",
  fileName: "generated_video_timestamp.mp4",
  originalName: "AI Generated Video",
  mimeType: "video/mp4",
  r2Key: "userId/projectId/segmentId/video/file.mp4",
  r2Url: "https://domain.com/userId/projectId/segmentId/video/file.mp4",
  uploadStatus: "completed",
  projectId: "project-id",
  segmentId: "segment-id",
  metadata: {
    generatedFromImage: true,
    model: "fal-ai/minimax-video",
    sourceImageUrl: "...",
    generationParams: {...}
  }
}
```

### Database Integration
- Use existing files table and API endpoints
- No schema changes required
- Leverage existing file cleanup mechanisms

## Technical Considerations

### Performance
- Video generation can take 30-60 seconds
- Implement proper loading states
- Consider background processing for long operations

### Error Handling
- FalAI API failures
- R2 upload failures  
- Network timeout handling
- Graceful degradation

### Cost Management
- Video generation is expensive
- Consider usage limits for free tier
- Implement proper billing integration

### File Size
- Generated videos typically 2-10MB
- Monitor R2 storage costs
- Consider video compression options

## Success Metrics
- Video generation success rate > 95%
- Average generation time < 60 seconds
- User engagement with video feature
- Storage cost efficiency

## Future Enhancements
- Multiple video styles/models
- Video editing capabilities
- Batch video generation
- Video templates and presets
- Custom motion parameters