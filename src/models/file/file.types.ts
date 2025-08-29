import { Document, Model, Types } from 'mongoose';

/**
 * File type enumeration
 */
export enum FileType {
  IMAGE = 'image',
  VIDEO = 'video',
  DOCUMENT = 'document',
  OTHER = 'other',
}

/**
 * Image format enumeration
 */
export enum ImageFormat {
  JPEG = 'jpeg',
  PNG = 'png',
  GIF = 'gif',
  WEBP = 'webp',
  SVG = 'svg',
  BMP = 'bmp',
  ICO = 'ico',
}

/**
 * Video quality enumeration
 */
export enum VideoQuality {
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low',
  THUMBNAIL = 'thumbnail',
}

/**
 * Processing status enumeration
 */
export enum ProcessingStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

/**
 * Image/Video variant interface
 */
export interface IImageVariant {
  url: string;
  s3Key: string;
  mimeType: string;
  size: number;
  dimensions?: {
    width: number;
    height: number;
  };
}

/**
 * Video metadata interface
 */
export interface IVideoMetadata {
  duration?: number; // in seconds
  fps?: number;
  bitrate?: number;
  format?: string;
  videoCodec?: string;
  audioCodec?: string;
  audioChannels?: number;
  audioSampleRate?: number;
}

/**
 * Processing metadata interface
 */
export interface IProcessingMetadata {
  compressionRatio?: string;
  processedAt?: Date;
  processingTime?: number; // in milliseconds
  originalSize?: number;
  error?: string;
}

/**
 * File variants interface
 */
export interface IFileVariants {
  compressed?: IImageVariant;
  thumbnail?: IImageVariant;
  original?: IImageVariant;
  // Video quality variants
  high?: IImageVariant;
  medium?: IImageVariant;
  low?: IImageVariant;
}

/**
 * Base file document interface (without Document extension)
 */
export interface IFileBase {
  originalName: string;
  mimeType: string;
  size: number;
  url: string;
  s3Key: string;
  uploadedBy?: Types.ObjectId;
  
  // Media-specific fields
  isImage: boolean;
  isVideo: boolean;
  originalDimensions?: {
    width: number;
    height: number;
  };
  
  // Video-specific metadata
  videoMetadata?: IVideoMetadata;
  
  // Media variants
  variants?: IFileVariants;
  
  // Processing metadata
  processingMetadata?: IProcessingMetadata;
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

/**
 * File document interface with Document methods
 */
export interface IFile extends IFileBase, Document {
  // Virtual properties
  bestMediaUrl?: string;
  bestImageUrl?: string;
  thumbnailUrl?: string;
  streamingUrl?: string;
  
  // Instance methods
  getHumanReadableSize(): string;
  isProcessed(): boolean;
  getFormattedDuration(): string | null;
  getAvailableQualities(): string[];
}

/**
 * File model interface with static methods
 */
export interface IFileModel extends Model<IFile> {
  findImages(filter?: any): Promise<IFile[]>;
  findVideos(filter?: any): Promise<IFile[]>;
  findMedia(filter?: any): Promise<IFile[]>;
  findByUploader(userId: string | Types.ObjectId): Promise<IFile[]>;
  findUnprocessed(): Promise<IFile[]>;
  getTotalStorageByUser(userId: string | Types.ObjectId): Promise<number>;
}

/**
 * File query helpers interface
 */
export interface IFileQueryHelpers {
  byType(type: FileType): IFileQueryHelpers;
  byUploader(userId: string | Types.ObjectId): IFileQueryHelpers;
  processed(): IFileQueryHelpers;
  unprocessed(): IFileQueryHelpers;
  recent(days?: number): IFileQueryHelpers;
}