import { readFileSync } from 'fs';
import { join } from 'path';
import { R2Storage } from '@/lib/r2-storage';

interface UploadResult {
  success: boolean;
  publicUrl: string;
  key: string;
  fileSize: number;
}

/**
 * Upload background music files to R2 storage
 * This combines functionality from multiple upload scripts into one unified utility
 */
export class AssetUploader {
  /**
   * Upload the temporex.mp3 file to R2 bucket at assets/backgroundMusic/
   */
  static async uploadTemporex(): Promise<UploadResult> {
    try {
      console.log('🎵 Starting temporex.mp3 upload to R2...');
      
      // Read the temporex.mp3 file
      const filePath = join(process.cwd(), 'public', 'demo', 'temporex.mp3');
      const buffer = readFileSync(filePath);
      
      console.log(`📁 File read successfully: ${buffer.length} bytes`);
      
      // Upload to R2 at assets/backgroundMusic/temporex.mp3
      const key = 'assets/backgroundMusic/temporex.mp3';
      const contentType = 'audio/mpeg';
      
      console.log(`☁️ Uploading to R2 bucket at key: ${key}`);
      
      const publicUrl = await R2Storage.uploadFile(buffer, key, contentType);
      
      console.log('✅ Upload successful!');
      console.log(`🔗 Public URL: ${publicUrl}`);
      console.log(`🗂️ R2 Key: ${key}`);
      
      return {
        success: true,
        publicUrl,
        key,
        fileSize: buffer.length
      };
    } catch (error) {
      console.error('❌ Upload failed:', error);
      throw error;
    }
  }

  /**
   * Upload any audio file to R2 with custom key
   */
  static async uploadAudioFile(
    localPath: string, 
    r2Key: string, 
    fileName?: string
  ): Promise<UploadResult> {
    try {
      const displayName = fileName || r2Key;
      console.log(`🎵 Starting ${displayName} upload to R2...`);
      
      // Read the audio file
      const filePath = join(process.cwd(), localPath);
      const buffer = readFileSync(filePath);
      
      console.log(`📁 File read successfully: ${buffer.length} bytes`);
      
      // Upload to R2
      const contentType = 'audio/mpeg';
      
      console.log(`☁️ Uploading to R2 bucket at key: ${r2Key}`);
      
      const publicUrl = await R2Storage.uploadFile(buffer, r2Key, contentType);
      
      console.log('✅ Upload successful!');
      console.log(`🔗 Public URL: ${publicUrl}`);
      console.log(`🗂️ R2 Key: ${r2Key}`);
      
      return {
        success: true,
        publicUrl,
        key: r2Key,
        fileSize: buffer.length
      };
    } catch (error) {
      console.error('❌ Upload failed:', error);
      throw error;
    }
  }

  /**
   * Upload multiple background music files
   */
  static async uploadBackgroundMusicCollection(): Promise<UploadResult[]> {
    console.log('🎼 Starting background music collection upload...');
    
    // Define files to upload - can be expanded as needed
    const musicFiles = [
      {
        localPath: 'public/demo/temporex.mp3',
        r2Key: 'assets/backgroundMusic/temporex.mp3',
        name: 'Temporex'
      }
      // Add more files here as needed:
      // {
      //   localPath: 'public/demo/another-song.mp3',
      //   r2Key: 'assets/backgroundMusic/another-song.mp3',
      //   name: 'Another Song'
      // }
    ];

    const results: UploadResult[] = [];
    
    for (const file of musicFiles) {
      try {
        const result = await this.uploadAudioFile(file.localPath, file.r2Key, file.name);
        results.push(result);
      } catch (error) {
        console.error(`Failed to upload ${file.name}:`, error);
        // Continue with other files even if one fails
        results.push({
          success: false,
          publicUrl: '',
          key: file.r2Key,
          fileSize: 0
        });
      }
    }
    
    return results;
  }
}

// CLI interface - run specific upload based on command line argument
async function runUpload() {
  const command = process.argv[2];
  
  try {
    switch (command) {
      case 'temporex':
        const result = await AssetUploader.uploadTemporex();
        console.log('\n🎉 Temporex upload completed successfully!');
        console.log('Result:', result);
        break;
        
      case 'collection':
        const results = await AssetUploader.uploadBackgroundMusicCollection();
        console.log('\n🎼 Background music collection upload completed!');
        console.log(`Successfully uploaded: ${results.filter(r => r.success).length}/${results.length} files`);
        break;
        
      default:
        console.log('Usage:');
        console.log('  npx tsx src/scripts/upload-assets.ts temporex    - Upload temporex.mp3');
        console.log('  npx tsx src/scripts/upload-assets.ts collection  - Upload all background music');
        process.exit(1);
    }
    
    process.exit(0);
  } catch (error) {
    console.error('\n💥 Upload failed:', error);
    process.exit(1);
  }
}

// Run CLI if this script is executed directly
if (require.main === module) {
  runUpload();
}