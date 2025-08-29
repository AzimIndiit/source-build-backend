import { IFile } from './file.types.js';

/**
 * Get file size in human readable format
 */
export const getHumanReadableSize = (file: IFile): string => {
  if (!file) return '0 Bytes';
  
  const bytes = file.size || 0;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  
  if (bytes === 0) return '0 Bytes';
  
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
};

/**
 * Check if file has been processed
 */
export const isProcessed = (file: IFile): boolean => {
  if (!file) return false;
  
  if (file.isImage) {
    return !!file.variants?.compressed?.url;
  }
  
  if (file.isVideo) {
    return !!(
      file.variants?.medium?.url || 
      file.variants?.high?.url || 
      file.variants?.low?.url
    );
  }
  
  return false;
};

/**
 * Get formatted duration for videos
 */
export const getFormattedDuration = (file: IFile): string | null => {
  if (!file || !file.isVideo || !file.videoMetadata?.duration) {
    return null;
  }
  
  const duration = file.videoMetadata.duration;
  const hours = Math.floor(duration / 3600);
  const minutes = Math.floor((duration % 3600) / 60);
  const seconds = Math.floor(duration % 60);
  
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }
  
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
};

/**
 * Get available video qualities
 */
export const getAvailableQualities = (file: IFile): string[] => {
  if (!file || !file.isVideo) return [];
  
  const qualities: string[] = [];
  
  if (file.variants?.high?.url) qualities.push('high');
  if (file.variants?.medium?.url) qualities.push('medium');
  if (file.variants?.low?.url) qualities.push('low');
  
  return qualities;
};

/**
 * Get best available media URL
 */
export const getBestMediaUrl = (file: IFile): string => {
  if (!file) return '';
  
  if (file.isImage) {
    // Prefer compressed WebP version, fallback to original
    if (file.variants?.compressed?.url) {
      return file.variants.compressed.url;
    }
  } else if (file.isVideo) {
    // Prefer medium quality for videos, fallback to high, then original
    if (file.variants?.medium?.url) {
      return file.variants.medium.url;
    }
    if (file.variants?.high?.url) {
      return file.variants.high.url;
    }
  }
  
  return file.url || '';
};

/**
 * Get best available image URL (backward compatibility)
 */
export const getBestImageUrl = (file: IFile): string => {
  if (!file || !file.isImage) return file?.url || '';
  return getBestMediaUrl(file);
};

/**
 * Get thumbnail URL
 */
export const getThumbnailUrl = (file: IFile): string => {
  if (!file || !file.isImage && !file.isVideo) return file?.url || '';
  
  if (file.variants?.thumbnail?.url) {
    return file.variants.thumbnail.url;
  }
  
  return file.url || '';
};

/**
 * Get video streaming URL
 */
export const getStreamingUrl = (file: IFile): string | null => {
  if (!file || !file.isVideo) return null;
  
  // Return medium quality for streaming, fallback to available qualities
  if (file.variants?.medium?.url) {
    return file.variants.medium.url;
  }
  if (file.variants?.high?.url) {
    return file.variants.high.url;
  }
  if (file.variants?.low?.url) {
    return file.variants.low.url;
  }
  
  return file.url || null;
};

/**
 * Check if file is an image
 */
export const isImageFile = (file: IFile): boolean => {
  if (!file) return false;
  return file.isImage || file.mimeType?.startsWith('image/') || false;
};

/**
 * Check if file is a video
 */
export const isVideoFile = (file: IFile): boolean => {
  if (!file) return false;
  return file.isVideo || file.mimeType?.startsWith('video/') || false;
};

/**
 * Check if file is a document
 */
export const isDocumentFile = (file: IFile): boolean => {
  if (!file) return false;
  const documentMimeTypes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'text/plain',
    'text/csv',
  ];
  
  return !file.isImage && !file.isVideo && documentMimeTypes.includes(file.mimeType || '');
};

/**
 * Get file extension from original name
 */
export const getFileExtension = (file: IFile): string => {
  if (!file) return '';
  const parts = file.originalName?.split('.') || [];
  if (parts.length > 1) {
    return parts.pop()?.toLowerCase() || '';
  }
  return '';
};

/**
 * Get file name without extension
 */
export const getFileNameWithoutExtension = (file: IFile): string => {
  if (!file) return '';
  const extension = getFileExtension(file);
  if (extension) {
    return (file.originalName || '').slice(0, -(extension.length + 1));
  }
  return file.originalName || '';
};