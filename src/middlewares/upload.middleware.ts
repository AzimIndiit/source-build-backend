import multer from 'multer';
import { Upload } from '@aws-sdk/lib-storage';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import path from 'path';
import { Request, Response, NextFunction } from 'express';
import ApiError from '@utils/ApiError.js';
import { getS3Client, getBucketName, getRegion } from '@config/aws.js';
import imageProcessingService from '@services/imageProcessingService.js';
import videoProcessingService from '@services/videoProcessingService.js';
import logger from '@config/logger.js';

// Use specific MIME types instead of wildcards
const allowedMimeTypes = [
  // Image formats
  'image/jpeg',
  'image/jpg',
  'image/pjpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/bmp',
  'image/tiff',
  'image/tif',
  'image/svg+xml',
  
  // Document formats
  'application/pdf',
  
  // Video formats
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

const MAX_SIZE = 100 * 1024 * 1024; // 100MB
const CHUNK_SIZE = 5 * 1024 * 1024; // 5MB chunks for multipart upload

interface S3UploadResult {
  Location: string;
  Bucket: string;
  Key: string;
  ETag?: string;
  VersionId?: string;
}

interface ProcessedFile {
  key: string;
  location: string;
  bucket: string;
  etag?: string;
  versionId?: string;
  isImage?: boolean;
  isVideo?: boolean;
  originalDimensions?: any;
  videoMetadata?: any;
  variants?: any;
  processingMetadata?: any;
}

/**
 * File filter for multer
 */
const fileFilter = (
  req: Express.Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
) => {
  logger.debug('Uploaded file:', {
    originalname: file.originalname,
    mimetype: file.mimetype,
    size: file.size
  });

  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    const error = new ApiError(
      `Invalid file type: ${file.mimetype}. Supported formats: JPEG, PNG, GIF, WebP, BMP, TIFF, SVG, PDF, and video files (MP4, AVI, MOV, etc.).`,
      'INVALID_FILE_TYPE',
      400
    );
    cb(error as any);
  }
};

/**
 * Upload file to S3
 */
const uploadToS3 = async (
  buffer: Buffer,
  filename: string,
  contentType: string,
  metadata: Record<string, string> = {}
): Promise<S3UploadResult> => {
  try {
    const s3Client = getS3Client();
    const bucketName = getBucketName();
    const region = getRegion();

    // For large files, use multipart upload
    if (buffer.length > CHUNK_SIZE) {
      const upload = new Upload({
        client: s3Client,
        params: {
          Bucket: bucketName,
          Key: filename,
          Body: buffer,
          ContentType: contentType,
          ACL: 'public-read',
          Metadata: metadata,
        },
        queueSize: 4,
        partSize: CHUNK_SIZE,
        leavePartsOnError: false,
      });

      const result = await upload.done();
      return {
        Location: `https://${bucketName}.s3.${region}.amazonaws.com/${filename}`,
        Bucket: bucketName,
        Key: filename,
        ETag: (result as any).ETag,
        VersionId: (result as any).VersionId,
      };
    } else {
      // For smaller files, use simple upload
      const uploadParams = {
        Bucket: bucketName,
        Key: filename,
        Body: buffer,
        ContentType: contentType,
        ACL: 'public-read' as const,
        Metadata: metadata,
      };

      const result = await s3Client.send(new PutObjectCommand(uploadParams));
      return {
        Location: `https://${bucketName}.s3.${region}.amazonaws.com/${filename}`,
        Bucket: bucketName,
        Key: filename,
        ETag: result.ETag,
        VersionId: result.VersionId,
      };
    }
  } catch (error) {
    logger.error('S3 upload error:', error);
    throw new ApiError(
      'Failed to upload file to cloud storage',
      'S3_UPLOAD_FAILED',
      500
    );
  }
};

/**
 * Process and upload video variants
 */
const processAndUploadVideo = async (
  file: Express.Multer.File,
  fieldName: string
): Promise<ProcessedFile> => {
  try {
    const processingStartTime = Date.now();
    const bucketName = getBucketName();
    
    // Generate video variants
    const result = await videoProcessingService.generateVideoVariants(
      file.buffer,
      {
        createThumbnail: true,
        compressVideo: true,
        qualities: ['medium', 'high'],
        thumbnailOptions: { width: 320, height: 240, format: 'webp' }
      }
    );

    const { variants, metadata, processingTime } = result;
    
    // Upload variants to S3
    const uploadedVariants: any = {};
    const timestamp = Date.now();
    const baseFilename = `${timestamp}-${fieldName}`;
    
    // Upload compressed video qualities
    for (const [quality, videoData] of Object.entries(variants)) {
      if (quality === 'thumbnail') continue;
      
      const videoFilename = `uploads/videos/${quality}/${baseFilename}.mp4`;
      const videoResult = await uploadToS3(
        videoData.buffer,
        videoFilename,
        videoData.mimeType,
        {
          'original-size': file.size.toString(),
          'compression-ratio': videoData.compressionRatio || '0%',
          'processing-time': videoData.processingTime?.toString() || '0',
          'quality': quality
        }
      );
      
      uploadedVariants[quality] = {
        url: videoResult.Location,
        s3Key: videoFilename,
        mimeType: videoData.mimeType,
        size: videoData.size,
        dimensions: metadata.video ? {
          width: metadata.video.width,
          height: metadata.video.height
        } : null
      };
    }
    
    // Upload thumbnail
    if (variants.thumbnail) {
      const thumbnailFilename = `uploads/video-thumbnails/${baseFilename}.webp`;
      const thumbnailResult = await uploadToS3(
        variants.thumbnail.buffer,
        thumbnailFilename,
        variants.thumbnail.mimeType,
        {
          'variant-type': 'video-thumbnail',
          'original-size': file.size.toString()
        }
      );
      
      uploadedVariants.thumbnail = {
        url: thumbnailResult.Location,
        s3Key: thumbnailFilename,
        mimeType: variants.thumbnail.mimeType,
        size: variants.thumbnail.size,
        dimensions: variants.thumbnail.dimensions
      };
    }
    
    // Upload original video (optional - for backup purposes)
    const originalExt = path.extname(file.originalname);
    const originalFilename = `uploads/videos/originals/${baseFilename}${originalExt}`;
    const originalResult = await uploadToS3(
      file.buffer,
      originalFilename,
      file.mimetype,
      {
        'variant-type': 'original',
        'file-size': file.size.toString()
      }
    );
    
    return {
      key: uploadedVariants.medium?.s3Key || uploadedVariants.high?.s3Key || originalFilename,
      location: uploadedVariants.medium?.url || uploadedVariants.high?.url || originalResult.Location,
      bucket: bucketName,
      etag: originalResult.ETag,
      versionId: originalResult.VersionId,
      isVideo: true,
      originalDimensions: metadata.video ? {
        width: metadata.video.width,
        height: metadata.video.height
      } : null,
      videoMetadata: {
        duration: metadata.duration,
        fps: metadata.video?.fps,
        bitrate: metadata.bitrate,
        format: metadata.format,
        videoCodec: metadata.video?.codec,
        audioCodec: metadata.audio?.codec,
        audioChannels: metadata.audio?.channels,
        audioSampleRate: metadata.audio?.sampleRate
      },
      variants: uploadedVariants,
      processingMetadata: {
        compressionRatio: variants.medium?.compressionRatio || variants.high?.compressionRatio || '0%',
        processedAt: new Date(),
        processingTime: processingTime + (Date.now() - processingStartTime),
        originalSize: file.size
      }
    };
    
  } catch (error) {
    logger.error('Video processing and upload error:', error);
    
    // Fallback: upload original file without processing
    logger.info('Falling back to original video upload...');
    const ext = path.extname(file.originalname);
    const filename = `uploads/videos/fallback/${Date.now()}-${fieldName}${ext}`;
    
    const result = await uploadToS3(file.buffer, filename, file.mimetype);
    
    return {
      key: filename,
      location: result.Location,
      bucket: result.Bucket,
      etag: result.ETag,
      versionId: result.VersionId,
      isVideo: videoProcessingService.isVideo(file.mimetype),
      processingMetadata: {
        error: error instanceof Error ? error.message : 'Unknown error',
        processedAt: new Date(),
        originalSize: file.size
      }
    };
  }
};

/**
 * Process and upload image variants
 */
const processAndUploadImage = async (
  file: Express.Multer.File,
  fieldName: string
): Promise<ProcessedFile> => {
  try {
    const processingStartTime = Date.now();
    const bucketName = getBucketName();
    
    // Validate image constraints
    await imageProcessingService.validateImageConstraints(file.buffer, file.mimetype);
    
    // Generate image variants
    const variants = await imageProcessingService.generateImageVariants(
      file.buffer,
      file.mimetype,
      {
        createThumbnail: true,
        thumbnailSize: { width: 300, height: 300 },
        compressOriginal: true,
        keepOriginal: false
      }
    );

    const processingTime = Date.now() - processingStartTime;
    
    // Upload variants to S3
    const uploadedVariants: any = {};
    const timestamp = Date.now();
    const baseFilename = `${timestamp}-${fieldName}`;
    
    // Upload compressed version
    if (variants.compressed) {
      const compressedFilename = `uploads/compressed/${baseFilename}.${variants.compressed.extension}`;
      const compressedResult = await uploadToS3(
        variants.compressed.buffer,
        compressedFilename,
        variants.compressed.mimeType,
        {
          'original-size': file.size.toString(),
          'compression-ratio': variants.compressed.compressionRatio || '0%',
          'processing-time': processingTime.toString()
        }
      );
      
      uploadedVariants.compressed = {
        url: compressedResult.Location,
        s3Key: compressedFilename,
        mimeType: variants.compressed.mimeType,
        size: variants.compressed.size,
        dimensions: variants.compressed.dimensions
      };
    }
    
    // Upload thumbnail
    if (variants.thumbnail) {
      const thumbnailFilename = `uploads/thumbnails/${baseFilename}.webp`;
      const thumbnailResult = await uploadToS3(
        variants.thumbnail.buffer,
        thumbnailFilename,
        variants.thumbnail.mimeType,
        {
          'variant-type': 'thumbnail',
          'original-size': file.size.toString()
        }
      );
      
      uploadedVariants.thumbnail = {
        url: thumbnailResult.Location,
        s3Key: thumbnailFilename,
        mimeType: variants.thumbnail.mimeType,
        size: variants.thumbnail.size,
        dimensions: variants.thumbnail.dimensions
      };
    }
    
    // Upload original (optional - for backup purposes)
    const originalExt = path.extname(file.originalname);
    const originalFilename = `uploads/originals/${baseFilename}${originalExt}`;
    const originalResult = await uploadToS3(
      file.buffer,
      originalFilename,
      file.mimetype,
      {
        'variant-type': 'original',
        'file-size': file.size.toString()
      }
    );
    
    // Get original image dimensions
    const originalMetadata = await imageProcessingService.processImage(
      file.buffer,
      file.mimetype,
      { convertToWebP: false }
    );
    
    return {
      key: uploadedVariants.compressed?.s3Key || originalFilename,
      location: uploadedVariants.compressed?.url || originalResult.Location,
      bucket: bucketName,
      etag: originalResult.ETag,
      versionId: originalResult.VersionId,
      isImage: true,
      originalDimensions: originalMetadata.originalDimensions,
      variants: uploadedVariants,
      processingMetadata: {
        compressionRatio: variants.compressed?.compressionRatio || '0%',
        processedAt: new Date(),
        processingTime,
        originalSize: file.size
      }
    };
    
  } catch (error) {
    logger.error('Image processing and upload error:', error);
    
    // Fallback: upload original file without processing
    logger.info('Falling back to original file upload...');
    const ext = path.extname(file.originalname);
    const filename = `uploads/fallback/${Date.now()}-${fieldName}${ext}`;
    
    const result = await uploadToS3(file.buffer, filename, file.mimetype);
    
    return {
      key: filename,
      location: result.Location,
      bucket: result.Bucket,
      etag: result.ETag,
      versionId: result.VersionId,
      isImage: imageProcessingService.isImage(file.mimetype),
      processingMetadata: {
        error: error instanceof Error ? error.message : 'Unknown error',
        processedAt: new Date(),
        originalSize: file.size
      }
    };
  }
};

/**
 * Upload regular file (non-image, non-video)
 */
const uploadRegularFile = async (
  file: Express.Multer.File,
  fieldName: string
): Promise<ProcessedFile> => {
  try {
    const ext = path.extname(file.originalname);
    const filename = `uploads/${Date.now()}-${fieldName}${ext}`;

    logger.debug('Uploading regular file to S3:', filename);
    const result = await uploadToS3(file.buffer, filename, file.mimetype);

    return {
      key: filename,
      location: result.Location,
      bucket: result.Bucket,
      etag: result.ETag,
      versionId: result.VersionId,
      isImage: false
    };
  } catch (error) {
    logger.error('Regular file upload error:', error);
    throw error;
  }
};

/**
 * Multer configuration
 */
const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter,
  limits: { fileSize: MAX_SIZE },
});

/**
 * Single file upload middleware
 */
export const uploadMiddleware = (fieldName: string) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    const uploadSingle = upload.single(fieldName);

    uploadSingle(req, res, async (err) => {
      if (err) {
        logger.error('Upload error:', err);

        // Handle different types of multer errors
        if (err instanceof multer.MulterError) {
          switch (err.code) {
            case 'LIMIT_FILE_SIZE':
              return next(
                new ApiError(
                  `File too large. Maximum size allowed is ${MAX_SIZE / (1024 * 1024)}MB`,
                  'FILE_TOO_LARGE',
                  413
                )
              );
            case 'LIMIT_FILE_COUNT':
              return next(
                new ApiError('Too many files uploaded', 'TOO_MANY_FILES', 400)
              );
            case 'LIMIT_UNEXPECTED_FILE':
              return next(
                new ApiError(
                  `Unexpected file field. Expected field name: ${fieldName}`,
                  'UNEXPECTED_FILE_FIELD',
                  400
                )
              );
            case 'LIMIT_PART_COUNT':
              return next(
                new ApiError(
                  'Too many parts in multipart data',
                  'TOO_MANY_PARTS',
                  400
                )
              );
            default:
              return next(
                new ApiError(
                  err.message || 'Upload error occurred',
                  'UPLOAD_ERROR',
                  400
                )
              );
          }
        }

        // Handle custom errors (like from fileFilter)
        if (err instanceof ApiError) {
          return next(err);
        }

        // Handle other errors
        return next(
          new ApiError(
            err.message || 'File upload failed',
            'UPLOAD_FAILED',
            500
          )
        );
      }

      // If file was uploaded successfully, process and upload to S3
      if (req.file) {
        try {
          let uploadResult: ProcessedFile;
          
          // Check file type and process accordingly
          if (imageProcessingService.isImage(req.file.mimetype)) {
            logger.info('Processing image file:', req.file.originalname);
            uploadResult = await processAndUploadImage(req.file, fieldName);
          } else if (videoProcessingService.isVideo(req.file.mimetype)) {
            logger.info('Processing video file:', req.file.originalname);
            uploadResult = await processAndUploadVideo(req.file, fieldName);
          } else {
            logger.info('Uploading regular file:', req.file.originalname);
            uploadResult = await uploadRegularFile(req.file, fieldName);
          }

          // Replace multer file object with S3 result
          (req as any).file = {
            ...req.file,
            ...uploadResult
          };

          logger.info('Upload successful:', uploadResult.location);
        } catch (uploadError) {
          logger.error('S3 upload error:', uploadError);
          return next(uploadError);
        }
      }

      next();
    });
  };
};

/**
 * Multiple files upload middleware
 */
export const uploadArray = (fieldName: string, maxCount: number = 5) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    const uploadMultiple = upload.array(fieldName, maxCount);

    uploadMultiple(req, res, async (err) => {
      if (err) {
        logger.error('Upload error:', err);

        if (err instanceof multer.MulterError) {
          switch (err.code) {
            case 'LIMIT_FILE_SIZE':
              return next(
                new ApiError(
                  `File too large. Maximum size allowed is ${MAX_SIZE / (1024 * 1024)}MB`,
                  'FILE_TOO_LARGE',
                  413
                )
              );
            case 'LIMIT_FILE_COUNT':
              return next(
                new ApiError(
                  `Too many files. Maximum ${maxCount} files allowed`,
                  'TOO_MANY_FILES',
                  400
                )
              );
            case 'LIMIT_UNEXPECTED_FILE':
              return next(
                new ApiError(
                  `Unexpected file field. Expected field name: ${fieldName}`,
                  'UNEXPECTED_FILE_FIELD',
                  400
                )
              );
            default:
              return next(
                new ApiError(
                  err.message || 'Upload error occurred',
                  'UPLOAD_ERROR',
                  400
                )
              );
          }
        }

        if (err instanceof ApiError) {
          return next(err);
        }

        return next(
          new ApiError(
            err.message || 'File upload failed',
            'UPLOAD_FAILED',
            500
          )
        );
      }

      // If files were uploaded successfully, process and upload each to S3
      if (req.files && Array.isArray(req.files) && req.files.length > 0) {
        try {
          const uploadPromises = req.files.map(async (file, index) => {
            let uploadResult: ProcessedFile;
            
            // Check file type and process accordingly
            if (imageProcessingService.isImage(file.mimetype)) {
              logger.info(`Processing image file ${index + 1}:`, file.originalname);
              uploadResult = await processAndUploadImage(file, `${fieldName}-${index}`);
            } else if (videoProcessingService.isVideo(file.mimetype)) {
              logger.info(`Processing video file ${index + 1}:`, file.originalname);
              uploadResult = await processAndUploadVideo(file, `${fieldName}-${index}`);
            } else {
              logger.info(`Uploading regular file ${index + 1}:`, file.originalname);
              uploadResult = await uploadRegularFile(file, `${fieldName}-${index}`);
            }

            return {
              ...file,
              ...uploadResult
            };
          });

          (req as any).files = await Promise.all(uploadPromises);
          logger.info('All uploads successful');
        } catch (uploadError) {
          logger.error('Multiple file upload error:', uploadError);
          return next(uploadError);
        }
      }

      next();
    });
  };
};

// Export convenience methods
export const single = uploadMiddleware;
export const array = uploadArray;

// Export the entire upload middleware
export default {
  upload,
  uploadMiddleware,
  uploadArray,
  single,
  array,
};