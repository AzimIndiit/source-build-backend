import { Request, Response, NextFunction } from 'express';
import ApiResponse from '@utils/ApiResponse.js';
import ApiError from '@utils/ApiError.js';
import catchAsync from '@utils/catchAsync.js';
import logger from '@config/logger.js';
import { getBucketName, getRegion } from '@config/aws.js';

/**
 * Extended file interface from multer with S3 upload results
 */
interface UploadedFile extends Express.Multer.File {
  location?: string;
  key?: string;
  bucket?: string;
  etag?: string;
  versionId?: string;
  isImage?: boolean;
  isVideo?: boolean;
  originalDimensions?: {
    width: number;
    height: number;
  };
  videoMetadata?: any;
  variants?: any;
  processingMetadata?: any;
}

/**
 * Universal POST handler - Upload single or multiple files
 */
export const handlePost = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  try {
    let files: UploadedFile[] = [];
    
    // Handle both single file and multiple files
    if (req.file) {
      files = [req.file as UploadedFile];
    } else if (req.files && Array.isArray(req.files)) {
      files = req.files as UploadedFile[];
    } else {
      throw ApiError.badRequest('No file(s) uploaded', undefined, 'NO_FILE');
    }

    const uploadedFiles: any[] = [];
    const bucketName = getBucketName();
    const region = getRegion();

    for (const file of files) {
      const { 
        originalname, 
        mimetype, 
        size, 
        location,
        key,
        isImage,
        isVideo,
        originalDimensions,
        videoMetadata,
        variants,
        processingMetadata
      } = file;

      // Determine the main file URL (prefer compressed version for images)
      const fileUrl = location || `https://${bucketName}.s3.${region}.amazonaws.com/${key}`;

      // Create file record in database
      const fileData: any = {
        originalName: originalname,
        mimeType: mimetype,
        size,
        url: fileUrl,
        s3Key: key!,
        uploadedBy: req.userId || undefined,
        isImage: isImage || false,
        isVideo: isVideo || false,
      };

      // Add media-specific data
      if (isImage || isVideo) {
        fileData.originalDimensions = originalDimensions;
        fileData.variants = variants;
        fileData.processingMetadata = processingMetadata;
      }

      // Add video-specific data
      if (isVideo && videoMetadata) {
        fileData.videoMetadata = videoMetadata;
      }

      const dbFile = await FileModal.create(fileData);
      
      // Prepare response data
      const responseFile: any = {
        id: dbFile._id,
        filename: dbFile.originalName,
        originalName: dbFile.originalName,
        mimeType: dbFile.mimeType,
        size: dbFile.size,
        url: dbFile.url,
        uploadedAt: dbFile.createdAt,
        isImage: dbFile.isImage,
        isVideo: dbFile.isVideo,
      };

      // Add image-specific response data
      if (dbFile.isImage) {
        responseFile.dimensions = dbFile.originalDimensions;
        responseFile.thumbnailUrl = dbFile.thumbnailUrl;
        responseFile.bestImageUrl = dbFile.bestImageUrl;
        responseFile.variants = {
          compressed: dbFile.variants?.compressed ? {
            url: dbFile.variants.compressed.url,
            size: dbFile.variants.compressed.size,
            dimensions: dbFile.variants.compressed.dimensions
          } : null,
          thumbnail: dbFile.variants?.thumbnail ? {
            url: dbFile.variants.thumbnail.url,
            size: dbFile.variants.thumbnail.size,
            dimensions: dbFile.variants.thumbnail.dimensions
          } : null
        };
        responseFile.processingInfo = {
          compressionRatio: dbFile.processingMetadata?.compressionRatio,
          processedAt: dbFile.processingMetadata?.processedAt,
          processingTime: dbFile.processingMetadata?.processingTime,
          originalSize: dbFile.processingMetadata?.originalSize,
          error: dbFile.processingMetadata?.error
        };
      }

      // Add video-specific response data
      if (dbFile.isVideo) {
        responseFile.dimensions = dbFile.originalDimensions;
        responseFile.thumbnailUrl = dbFile.thumbnailUrl;
        responseFile.streamingUrl = dbFile.streamingUrl;
        responseFile.duration = dbFile.videoMetadata?.duration;
        responseFile.formattedDuration = dbFile.getFormattedDuration();
        responseFile.availableQualities = dbFile.getAvailableQualities();
        responseFile.videoMetadata = dbFile.videoMetadata;
        responseFile.variants = {
          high: dbFile.variants?.high ? {
            url: dbFile.variants.high.url,
            size: dbFile.variants.high.size,
            dimensions: dbFile.variants.high.dimensions
          } : null,
          medium: dbFile.variants?.medium ? {
            url: dbFile.variants.medium.url,
            size: dbFile.variants.medium.size,
            dimensions: dbFile.variants.medium.dimensions
          } : null,
          low: dbFile.variants?.low ? {
            url: dbFile.variants.low.url,
            size: dbFile.variants.low.size,
            dimensions: dbFile.variants.low.dimensions
          } : null,
          thumbnail: dbFile.variants?.thumbnail ? {
            url: dbFile.variants.thumbnail.url,
            size: dbFile.variants.thumbnail.size,
            dimensions: dbFile.variants.thumbnail.dimensions
          } : null
        };
        responseFile.processingInfo = {
          compressionRatio: dbFile.processingMetadata?.compressionRatio,
          processedAt: dbFile.processingMetadata?.processedAt,
          processingTime: dbFile.processingMetadata?.processingTime,
          originalSize: dbFile.processingMetadata?.originalSize,
          error: dbFile.processingMetadata?.error
        };
      }

      uploadedFiles.push(responseFile);
    }

    // Return single file or array based on input
    const responseData = uploadedFiles.length === 1 ? uploadedFiles[0] : {
      files: uploadedFiles,
      meta: {
        total: uploadedFiles.length,
        uploaded: uploadedFiles.length,
        failed: 0,
        images: uploadedFiles.filter(f => f.isImage).length,
        videos: uploadedFiles.filter(f => f.isVideo).length,
        documents: uploadedFiles.filter(f => !f.isImage && !f.isVideo).length
      }
    };

    logger.info('Files uploaded successfully', { 
      count: uploadedFiles.length,
      userId: req.userId 
    });

    return ApiResponse.success(
      res,
      responseData,
      `File${uploadedFiles.length > 1 ? 's' : ''} uploaded successfully`,
      201
    );
  } catch (error) {
    logger.error('File upload controller error:', error);
    throw error;
  }
});

/**
 * Universal GET handler - Get files based on route and params
 */
export const handleGet = catchAsync(async (req: Request, res: Response) => {
  // Determine the type of GET request based on the path
  const path = req.path;
  const { id } = req.params;
  
  // If there's an ID parameter, get single file
  if (id) {
    return getFileById(req, res);
  }
  
  // If path contains 'my-files', get user's files
  if (path.includes('my-files')) {
    return getUserFiles(req, res);
  }
  
  // Default: get all files with pagination
  return getAllFiles(req, res);
});

/**
 * Get file by ID (internal)
 */
const getFileById = async (req: Request, res: Response) => {
  const { id } = req.params;
  
  const file = await FileModal.findById(id).populate('uploadedBy', 'email profile.displayName');
  
  if (!file) {
    throw ApiError.notFound('File not found');
  }
  
  const responseData = {
    id: file._id,
    filename: file.originalName,
    mimeType: file.mimeType,
    size: file.size,
    humanReadableSize: file.getHumanReadableSize(),
    url: file.url,
    bestMediaUrl: file.bestMediaUrl,
    thumbnailUrl: file.thumbnailUrl,
    uploadedAt: file.createdAt,
    uploadedBy: file.uploadedBy,
    isImage: file.isImage,
    isVideo: file.isVideo,
    isProcessed: file.isProcessed(),
    dimensions: file.originalDimensions,
    variants: file.variants,
    videoMetadata: file.videoMetadata,
    processingMetadata: file.processingMetadata,
  };
  
  if (file.isVideo) {
    Object.assign(responseData, {
      streamingUrl: file.streamingUrl,
      formattedDuration: file.getFormattedDuration(),
      availableQualities: file.getAvailableQualities(),
    });
  }
  
  return ApiResponse.success(res, responseData, 'File retrieved successfully');
};

/**
 * Get all files with pagination (internal)
 */
const getAllFiles = async (req: Request, res: Response) => {
  const {
    page = 1,
    limit = 10,
    type,
    userId,
    sortBy = 'createdAt',
    order = 'desc'
  } = req.query;
  
  const pageNum = parseInt(page as string);
  const limitNum = parseInt(limit as string);
  const skip = (pageNum - 1) * limitNum;
  
  // Build query
  const query: any = {};
  
  if (type === 'image') {
    query.isImage = true;
  } else if (type === 'video') {
    query.isVideo = true;
  } else if (type === 'document') {
    query.isImage = false;
    query.isVideo = false;
  }
  
  if (userId) {
    query.uploadedBy = userId;
  }
  
  // Execute query with pagination
  const [files, total] = await Promise.all([
    FileModal.find(query)
      .populate('uploadedBy', 'email profile.displayName')
      .sort({ [sortBy as string]: order === 'desc' ? -1 : 1 })
      .skip(skip)
      .limit(limitNum),
    FileModal.countDocuments(query)
  ]);
  
  // Format response data
  const formattedFiles = files.map(file => ({
    id: file._id,
    filename: file.originalName,
    mimeType: file.mimeType,
    size: file.size,
    humanReadableSize: file.getHumanReadableSize(),
    url: file.url,
    thumbnailUrl: file.thumbnailUrl,
    uploadedAt: file.createdAt,
    uploadedBy: file.uploadedBy,
    isImage: file.isImage,
    isVideo: file.isVideo,
    isProcessed: file.isProcessed(),
    dimensions: file.originalDimensions,
    duration: file.isVideo ? file.videoMetadata?.duration : undefined,
    formattedDuration: file.isVideo ? file.getFormattedDuration() : undefined,
  }));
  
  const responseData = {
    files: formattedFiles,
    pagination: {
      page: pageNum,
      limit: limitNum,
      total,
      pages: Math.ceil(total / limitNum),
      hasNext: pageNum < Math.ceil(total / limitNum),
      hasPrev: pageNum > 1
    },
    meta: {
      images: await FileModal.countDocuments({ ...query, isImage: true }),
      videos: await FileModal.countDocuments({ ...query, isVideo: true }),
      documents: await FileModal.countDocuments({ ...query, isImage: false, isVideo: false }),
    }
  };
  
  return ApiResponse.success(res, responseData, 'Files retrieved successfully');
};

/**
 * Universal DELETE handler
 */
export const handleDelete = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  
  const file = await FileModal.findById(id);
  
  if (!file) {
    throw ApiError.notFound('File not found');
  }
  
  // Check authorization
  if (file.uploadedBy && file.uploadedBy.toString() !== req.userId) {
    throw ApiError.forbidden('You are not authorized to delete this file');
  }
  
  // TODO: Delete file from S3
  // await deleteFromS3(file.s3Key);
  // Also delete variants if they exist
  
  await file.deleteOne();
  
  logger.info('File deleted successfully', { 
    fileId: id, 
    userId: req.userId 
  });
  
  return ApiResponse.success(res, null, 'File deleted successfully');
});

/**
 * Get user's uploaded files (internal)
 */
const getUserFiles = async (req: Request, res: Response) => {
  const {
    page = 1,
    limit = 10,
    type,
    sortBy = 'createdAt',
    order = 'desc'
  } = req.query;
  
  const pageNum = parseInt(page as string);
  const limitNum = parseInt(limit as string);
  const skip = (pageNum - 1) * limitNum;
  
  // Build query
  const query: any = {
    uploadedBy: req.userId
  };
  
  if (type === 'image') {
    query.isImage = true;
  } else if (type === 'video') {
    query.isVideo = true;
  } else if (type === 'document') {
    query.isImage = false;
    query.isVideo = false;
  }
  
  // Execute query with pagination
  const [files, total] = await Promise.all([
    FileModal.find(query)
      .sort({ [sortBy as string]: order === 'desc' ? -1 : 1 })
      .skip(skip)
      .limit(limitNum),
    FileModal.countDocuments(query)
  ]);
  
  // Calculate storage usage
  const storageUsage = await FileModal.aggregate([
    { $match: { uploadedBy: new mongoose.Types.ObjectId(req.userId) } },
    { $group: { _id: null, totalSize: { $sum: '$size' } } }
  ]);
  
  const totalStorageUsed = storageUsage[0]?.totalSize || 0;
  
  // Format response data
  const formattedFiles = files.map(file => ({
    id: file._id,
    filename: file.originalName,
    mimeType: file.mimeType,
    size: file.size,
    humanReadableSize: file.getHumanReadableSize(),
    url: file.url,
    thumbnailUrl: file.thumbnailUrl,
    uploadedAt: file.createdAt,
    isImage: file.isImage,
    isVideo: file.isVideo,
    isProcessed: file.isProcessed(),
    dimensions: file.originalDimensions,
    duration: file.isVideo ? file.videoMetadata?.duration : undefined,
    formattedDuration: file.isVideo ? file.getFormattedDuration() : undefined,
  }));
  
  const responseData = {
    files: formattedFiles,
    pagination: {
      page: pageNum,
      limit: limitNum,
      total,
      pages: Math.ceil(total / limitNum),
      hasNext: pageNum < Math.ceil(total / limitNum),
      hasPrev: pageNum > 1
    },
    storage: {
      used: totalStorageUsed,
      humanReadable: formatBytes(totalStorageUsed),
      limit: 10 * 1024 * 1024 * 1024, // 10GB default limit
      percentUsed: Math.round((totalStorageUsed / (10 * 1024 * 1024 * 1024)) * 100)
    },
    meta: {
      totalFiles: total,
        images: await FileModal.countDocuments({ uploadedBy: req.userId, isImage: true }),
      videos: await FileModal.countDocuments({ uploadedBy: req.userId, isVideo: true }),
      documents: await FileModal.countDocuments({ uploadedBy: req.userId, isImage: false, isVideo: false }),
    }
  };
  
  return ApiResponse.success(res, responseData, 'User files retrieved successfully');
};

/**
 * Helper function to format bytes
 */
function formatBytes(bytes: number): string {
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  if (bytes === 0) return '0 Bytes';
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
}

// Import mongoose for aggregation
import mongoose from 'mongoose';
import FileModal from '@models/file/file.model.js';

// Export the universal handlers
export default {
  // Main handlers
  handlePost,  // Universal POST handler for all upload operations
  handleGet,   // Universal GET handler for all retrieval operations
  handleDelete, // Universal DELETE handler
  
  // Legacy exports for backward compatibility (can be removed later)
  uploadFile: handlePost,
  getFile: handleGet,
  getFiles: handleGet,
  deleteFile: handleDelete,
  getUserFiles: handleGet
};