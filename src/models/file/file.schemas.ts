import { Schema } from 'mongoose';
import {
  IImageVariant,
  IVideoMetadata,
  IProcessingMetadata,
  IFileVariants,
  IFile,
} from './file.types.js';

/**
 * Image variant schema for MongoDB
 */
export const imageVariantSchema = new Schema<IImageVariant>(
  {
    url: { 
      type: String, 
      required: [true, 'URL is required'],
      trim: true,
    },
    s3Key: { 
      type: String, 
      required: [true, 'S3 key is required'],
      trim: true,
    },
    mimeType: { 
      type: String, 
      required: [true, 'MIME type is required'],
      trim: true,
    },
    size: { 
      type: Number, 
      required: [true, 'Size is required'],
      min: [0, 'Size cannot be negative'],
    },
    dimensions: {
      width: { 
        type: Number,
        min: [1, 'Width must be at least 1'],
      },
      height: { 
        type: Number,
        min: [1, 'Height must be at least 1'],
      }
    }
  },
  { _id: false }
);

/**
 * Video metadata schema for MongoDB
 */
export const videoMetadataSchema = new Schema<IVideoMetadata>(
  {
    duration: { 
      type: Number,
      min: [0, 'Duration cannot be negative'],
    }, // in seconds
    fps: { 
      type: Number,
      min: [1, 'FPS must be at least 1'],
    },
    bitrate: { 
      type: Number,
      min: [1, 'Bitrate must be at least 1'],
    },
    format: { 
      type: String,
      trim: true,
    },
    videoCodec: { 
      type: String,
      trim: true,
    },
    audioCodec: { 
      type: String,
      trim: true,
    },
    audioChannels: { 
      type: Number,
      min: [0, 'Audio channels cannot be negative'],
    },
    audioSampleRate: { 
      type: Number,
      min: [1, 'Sample rate must be at least 1'],
    }
  },
  { _id: false }
);

/**
 * Processing metadata schema for MongoDB
 */
export const processingMetadataSchema = new Schema<IProcessingMetadata>(
  {
    compressionRatio: { 
      type: String,
      trim: true,
    },
    processedAt: { 
      type: Date,
      default: Date.now,
    },
    processingTime: { 
      type: Number,
      min: [0, 'Processing time cannot be negative'],
    }, // in milliseconds
    originalSize: { 
      type: Number,
      min: [0, 'Original size cannot be negative'],
    },
    error: { 
      type: String,
      trim: true,
    }
  },
  { _id: false }
);

/**
 * File variants schema for MongoDB
 */
export const fileVariantsSchema = new Schema<IFileVariants>(
  {
    compressed: imageVariantSchema,
    thumbnail: imageVariantSchema,
    original: imageVariantSchema,
    // Video quality variants
    high: imageVariantSchema,
    medium: imageVariantSchema,
    low: imageVariantSchema,
  },
  { _id: false }
);

/**
 * Main file schema for MongoDB
 */
export const fileSchema = new Schema<IFile>(
  {
    originalName: { 
      type: String, 
      required: [true, 'Original name is required'],
      trim: true,
      maxlength: [255, 'Original name cannot exceed 255 characters'],
    },
    mimeType: { 
      type: String, 
      required: [true, 'MIME type is required'],
      trim: true,
    },
    size: { 
      type: Number, 
      required: [true, 'File size is required'],
      min: [0, 'Size cannot be negative'],
    },
    url: { 
      type: String, 
      required: [true, 'URL is required'],
      trim: true,
    },
    s3Key: { 
      type: String, 
      required: [true, 'S3 key is required'],
      trim: true,
      unique: true,
    },
    uploadedBy: { 
      type: Schema.Types.ObjectId, 
      ref: 'User',
      index: true,
    },
    
    // Media-specific fields
    isImage: { 
      type: Boolean, 
      default: false,
      index: true,
    },
    isVideo: { 
      type: Boolean, 
      default: false,
      index: true,
    },
    originalDimensions: {
      width: { 
        type: Number,
        min: [1, 'Width must be at least 1'],
      },
      height: { 
        type: Number,
        min: [1, 'Height must be at least 1'],
      }
    },
    
    // Nested schemas
    videoMetadata: videoMetadataSchema,
    variants: fileVariantsSchema,
    processingMetadata: processingMetadataSchema,
  },
  { 
    timestamps: true,
    toJSON: { 
      virtuals: true,
      transform: function(_doc: any, ret: any) {
        delete ret.__v;
        return ret;
      }
    },
    toObject: { virtuals: true }
  }
);

/**
 * Schema options for the file schema
 */
export const fileSchemaOptions = {
  timestamps: true,
  toJSON: { 
    virtuals: true,
    transform: function(_doc: any, ret: any) {
      delete ret.__v;
      return ret;
    }
  },
  toObject: { virtuals: true },
};

/**
 * Create indexes for better query performance
 */
export const createFileIndexes = (schema: Schema) => {
  // Single field indexes
  schema.index({ uploadedBy: 1, createdAt: -1 });
  schema.index({ mimeType: 1 });
  schema.index({ isImage: 1 });
  schema.index({ isVideo: 1 });
  schema.index({ createdAt: -1 });
  schema.index({ s3Key: 1 });
  schema.index({ size: 1 });
  
  // Compound indexes for common queries
  schema.index({ uploadedBy: 1, isImage: 1 });
  schema.index({ uploadedBy: 1, isVideo: 1 });
  schema.index({ isImage: 1, createdAt: -1 });
  schema.index({ isVideo: 1, createdAt: -1 });
  
  // Text index for search
  schema.index({ originalName: 'text' });
};