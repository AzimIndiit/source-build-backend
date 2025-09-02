// @ts-nocheck
import ffmpeg from 'fluent-ffmpeg';
import { Readable, PassThrough } from 'stream';
import path from 'path';
import logger from '@config/logger.js';

export interface VideoDimensions {
  width: number;
  height: number;
}

export interface VideoMetadata {
  duration?: number;
  format?: string;
  bitrate?: number;
  video?: {
    codec: string;
    width: number;
    height: number;
    fps: number;
    bitrate?: number;
  };
  audio?: {
    codec: string;
    channels: number;
    sampleRate: number;
    bitrate?: number;
  };
}

export interface ProcessedVideo {
  buffer: Buffer;
  mimeType: string;
  size: number;
  dimensions?: VideoDimensions;
  compressionRatio?: string;
  processingTime?: number;
}

export interface VideoVariants {
  [quality: string]: ProcessedVideo;
  thumbnail?: ProcessedVideo;
}

export interface VideoProcessingOptions {
  createThumbnail?: boolean;
  compressVideo?: boolean;
  qualities?: string[];
  thumbnailOptions?: {
    width: number;
    height: number;
    format: string;
  };
  maxDuration?: number; // Maximum duration in seconds
  outputFormat?: string;
}

export interface VideoProcessingResult {
  variants: VideoVariants;
  metadata: VideoMetadata;
  processingTime: number;
}

class VideoProcessingService {
  private readonly supportedFormats = [
    'video/mp4',
    'video/mpeg',
    'video/mpg',
    'video/quicktime',
    'video/avi',
    'video/mov',
    'video/wmv',
    'video/flv',
    'video/webm',
    'video/mkv',
    'video/3gp',
    'video/x-msvideo',
    'video/x-flv',
    'video/x-matroska',
  ];

  private readonly maxVideoSize = 100 * 1024 * 1024; // 100MB
  private readonly maxDuration = 600; // 10 minutes in seconds

  private readonly qualitySettings = {
    low: {
      width: 640,
      height: 480,
      videoBitrate: '500k',
      audioBitrate: '96k',
      fps: 24,
    },
    medium: {
      width: 1280,
      height: 720,
      videoBitrate: '1000k',
      audioBitrate: '128k',
      fps: 30,
    },
    high: {
      width: 1920,
      height: 1080,
      videoBitrate: '2500k',
      audioBitrate: '192k',
      fps: 30,
    },
  };

  /**
   * Check if the file is a video
   */
  isVideo(mimeType: string): boolean {
    return this.supportedFormats.includes(mimeType.toLowerCase());
  }

  /**
   * Convert Buffer to Readable Stream
   */
  private bufferToStream(buffer: Buffer): Readable {
    const stream = new Readable();
    stream.push(buffer);
    stream.push(null);
    return stream;
  }

  /**
   * Extract video metadata
   */
  async getVideoMetadata(buffer: Buffer): Promise<VideoMetadata> {
    return new Promise((resolve, reject) => {
      const stream = this.bufferToStream(buffer);

      ffmpeg.ffprobe(stream as any, (err, metadata) => {
        if (err) {
          logger.error('Failed to extract video metadata:', err);
          reject(err);
          return;
        }

        const videoStream = metadata.streams.find(s => s.codec_type === 'video');
        const audioStream = metadata.streams.find(s => s.codec_type === 'audio');

        resolve({
          duration: metadata.format.duration,
          format: metadata.format.format_name,
          bitrate: metadata.format.bit_rate ? parseInt(metadata.format.bit_rate) : undefined,
          video: videoStream ? {
            codec: videoStream.codec_name || 'unknown',
            width: videoStream.width || 0,
            height: videoStream.height || 0,
            fps: videoStream.r_frame_rate ? 
              eval(videoStream.r_frame_rate) : 30, // Parse frame rate like "30/1"
            bitrate: videoStream.bit_rate ? parseInt(videoStream.bit_rate) : undefined,
          } : undefined,
          audio: audioStream ? {
            codec: audioStream.codec_name || 'unknown',
            channels: audioStream.channels || 2,
            sampleRate: audioStream.sample_rate ? parseInt(audioStream.sample_rate) : 44100,
            bitrate: audioStream.bit_rate ? parseInt(audioStream.bit_rate) : undefined,
          } : undefined,
        });
      });
    });
  }

  /**
   * Process video with ffmpeg
   */
  private async processVideoWithFFmpeg(
    buffer: Buffer,
    quality: keyof typeof this.qualitySettings,
    outputFormat: string = 'mp4'
  ): Promise<ProcessedVideo> {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      const settings = this.qualitySettings[quality];
      const chunks: Buffer[] = [];
      const stream = this.bufferToStream(buffer);
      const passThrough = new PassThrough();

      ffmpeg(stream as any)
        .outputFormat(outputFormat)
        .videoCodec('libx264')
        .audioCodec('aac')
        .size(`${settings.width}x${settings.height}`)
        .videoBitrate(settings.videoBitrate)
        .audioBitrate(settings.audioBitrate)
        .fps(settings.fps)
        .outputOptions([
          '-preset fast',
          '-crf 23',
          '-movflags +faststart',
        ])
        .on('error', (err) => {
          logger.error(`Video processing error for ${quality} quality:`, err);
          reject(err);
        })
        .on('end', () => {
          const processedBuffer = Buffer.concat(chunks);
          const processingTime = Date.now() - startTime;

          resolve({
            buffer: processedBuffer,
            mimeType: `video/${outputFormat}`,
            size: processedBuffer.length,
            dimensions: {
              width: settings.width,
              height: settings.height,
            },
            compressionRatio: `${Math.round((1 - processedBuffer.length / buffer.length) * 100)}%`,
            processingTime,
          });
        })
        .pipe(passThrough);

      passThrough.on('data', (chunk) => {
        chunks.push(chunk);
      });
    });
  }

  /**
   * Generate video thumbnail
   */
  private async generateThumbnail(
    buffer: Buffer,
    options: { width: number; height: number; format: string }
  ): Promise<ProcessedVideo> {
    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = [];
      const stream = this.bufferToStream(buffer);
      const passThrough = new PassThrough();

      ffmpeg(stream as any)
        .screenshots({
          timestamps: ['10%'], // Take screenshot at 10% of video duration
          size: `${options.width}x${options.height}`,
        })
        .outputFormat(options.format)
        .on('error', (err) => {
          logger.error('Thumbnail generation error:', err);
          reject(err);
        })
        .on('end', () => {
          const thumbnailBuffer = Buffer.concat(chunks);
          
          resolve({
            buffer: thumbnailBuffer,
            mimeType: `image/${options.format}`,
            size: thumbnailBuffer.length,
            dimensions: {
              width: options.width,
              height: options.height,
            },
          });
        })
        .pipe(passThrough);

      passThrough.on('data', (chunk) => {
        chunks.push(chunk);
      });
    });
  }

  /**
   * Validate video constraints
   */
  async validateVideoConstraints(buffer: Buffer, mimeType: string): Promise<void> {
    if (!this.isVideo(mimeType)) {
      throw new Error(`Unsupported video format: ${mimeType}`);
    }

    if (buffer.length > this.maxVideoSize) {
      throw new Error(`Video size exceeds maximum allowed size of ${this.maxVideoSize / (1024 * 1024)}MB`);
    }

    try {
      const metadata = await this.getVideoMetadata(buffer);
      
      if (metadata.duration && metadata.duration > this.maxDuration) {
        throw new Error(
          `Video duration (${Math.round(metadata.duration)}s) exceeds maximum allowed duration (${this.maxDuration}s)`
        );
      }
    } catch (error) {
      logger.error('Video validation error:', error);
      throw error;
    }
  }

  /**
   * Generate multiple video variants
   */
  async generateVideoVariants(
    buffer: Buffer,
    options: VideoProcessingOptions = {}
  ): Promise<VideoProcessingResult> {
    const startTime = Date.now();
    const variants: VideoVariants = {};
    
    try {
      // Get video metadata
      const metadata = await this.getVideoMetadata(buffer);

      // Validate constraints
      if (options.maxDuration && metadata.duration && metadata.duration > options.maxDuration) {
        throw new Error(`Video duration exceeds maximum allowed duration of ${options.maxDuration}s`);
      }

      // Generate different quality versions
      const qualities = options.qualities || ['medium'];
      
      for (const quality of qualities) {
        if (quality in this.qualitySettings) {
          try {
            variants[quality] = await this.processVideoWithFFmpeg(
              buffer,
              quality as keyof typeof this.qualitySettings,
              options.outputFormat || 'mp4'
            );
          } catch (error) {
            logger.error(`Failed to process ${quality} quality video:`, error);
            // Continue with other qualities even if one fails
          }
        }
      }

      // Generate thumbnail if requested
      if (options.createThumbnail) {
        const thumbnailOptions = options.thumbnailOptions || {
          width: 320,
          height: 240,
          format: 'webp',
        };

        try {
          variants.thumbnail = await this.generateThumbnail(buffer, thumbnailOptions);
        } catch (error) {
          logger.error('Failed to generate thumbnail:', error);
        }
      }

      const processingTime = Date.now() - startTime;

      return {
        variants,
        metadata,
        processingTime,
      };
    } catch (error) {
      logger.error('Video variant generation error:', error);
      throw error;
    }
  }

  /**
   * Compress video with default settings
   */
  async compressVideo(buffer: Buffer, quality: string = 'medium'): Promise<ProcessedVideo> {
    if (!(quality in this.qualitySettings)) {
      quality = 'medium';
    }

    return this.processVideoWithFFmpeg(
      buffer,
      quality as keyof typeof this.qualitySettings,
      'mp4'
    );
  }

  /**
   * Extract audio from video
   */
  async extractAudio(buffer: Buffer, format: string = 'mp3'): Promise<ProcessedVideo> {
    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = [];
      const stream = this.bufferToStream(buffer);
      const passThrough = new PassThrough();

      ffmpeg(stream as any)
        .noVideo()
        .audioCodec('libmp3lame')
        .audioBitrate('128k')
        .outputFormat(format)
        .on('error', (err) => {
          logger.error('Audio extraction error:', err);
          reject(err);
        })
        .on('end', () => {
          const audioBuffer = Buffer.concat(chunks);
          
          resolve({
            buffer: audioBuffer,
            mimeType: `audio/${format}`,
            size: audioBuffer.length,
          });
        })
        .pipe(passThrough);

      passThrough.on('data', (chunk) => {
        chunks.push(chunk);
      });
    });
  }
}

export default new VideoProcessingService();