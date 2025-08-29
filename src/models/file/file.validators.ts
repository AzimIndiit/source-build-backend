import { IFile } from './file.types.js';

/**
 * Allowed image MIME types
 */
export const ALLOWED_IMAGE_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/svg+xml',
  'image/bmp',
  'image/x-icon',
  'image/ico',
];

/**
 * Allowed video MIME types
 */
export const ALLOWED_VIDEO_TYPES = [
  'video/mp4',
  'video/mpeg',
  'video/ogg',
  'video/webm',
  'video/quicktime',
  'video/x-msvideo',
  'video/x-flv',
  'video/x-matroska',
];

/**
 * Allowed document MIME types
 */
export const ALLOWED_DOCUMENT_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/plain',
  'text/csv',
  'application/json',
  'application/xml',
  'text/xml',
];

/**
 * File size limits (in bytes)
 */
export const FILE_SIZE_LIMITS = {
  image: 10 * 1024 * 1024,        // 10MB
  video: 100 * 1024 * 1024,       // 100MB
  document: 25 * 1024 * 1024,     // 25MB
  default: 50 * 1024 * 1024,      // 50MB
};

/**
 * Image dimension limits
 */
export const IMAGE_DIMENSION_LIMITS = {
  maxWidth: 10000,
  maxHeight: 10000,
  minWidth: 10,
  minHeight: 10,
};

/**
 * Video duration limits (in seconds)
 */
export const VIDEO_DURATION_LIMITS = {
  max: 3600,  // 1 hour
  min: 1,     // 1 second
};

/**
 * Validate file MIME type
 */
export function validateMimeType(mimeType: string): boolean {
  const allAllowedTypes = [
    ...ALLOWED_IMAGE_TYPES,
    ...ALLOWED_VIDEO_TYPES,
    ...ALLOWED_DOCUMENT_TYPES,
  ];
  
  return allAllowedTypes.includes(mimeType.toLowerCase());
}

/**
 * Validate image MIME type
 */
export function validateImageMimeType(mimeType: string): boolean {
  return ALLOWED_IMAGE_TYPES.includes(mimeType.toLowerCase());
}

/**
 * Validate video MIME type
 */
export function validateVideoMimeType(mimeType: string): boolean {
  return ALLOWED_VIDEO_TYPES.includes(mimeType.toLowerCase());
}

/**
 * Validate document MIME type
 */
export function validateDocumentMimeType(mimeType: string): boolean {
  return ALLOWED_DOCUMENT_TYPES.includes(mimeType.toLowerCase());
}

/**
 * Validate file size
 */
export function validateFileSize(
  size: number,
  mimeType: string
): { valid: boolean; maxSize: number; message?: string } {
  let maxSize = FILE_SIZE_LIMITS.default;
  
  if (validateImageMimeType(mimeType)) {
    maxSize = FILE_SIZE_LIMITS.image;
  } else if (validateVideoMimeType(mimeType)) {
    maxSize = FILE_SIZE_LIMITS.video;
  } else if (validateDocumentMimeType(mimeType)) {
    maxSize = FILE_SIZE_LIMITS.document;
  }
  
  const valid = size <= maxSize;
  
  return {
    valid,
    maxSize,
    ...(valid ? {} : { message: `File size exceeds maximum allowed size of ${formatBytes(maxSize)}` }),
  };
}

/**
 * Validate image dimensions
 */
export function validateImageDimensions(
  width: number,
  height: number
): { valid: boolean; message?: string } {
  const errors: string[] = [];
  
  if (width > IMAGE_DIMENSION_LIMITS.maxWidth) {
    errors.push(`Width exceeds maximum of ${IMAGE_DIMENSION_LIMITS.maxWidth}px`);
  }
  if (height > IMAGE_DIMENSION_LIMITS.maxHeight) {
    errors.push(`Height exceeds maximum of ${IMAGE_DIMENSION_LIMITS.maxHeight}px`);
  }
  if (width < IMAGE_DIMENSION_LIMITS.minWidth) {
    errors.push(`Width is below minimum of ${IMAGE_DIMENSION_LIMITS.minWidth}px`);
  }
  if (height < IMAGE_DIMENSION_LIMITS.minHeight) {
    errors.push(`Height is below minimum of ${IMAGE_DIMENSION_LIMITS.minHeight}px`);
  }
  
  return {
    valid: errors.length === 0,
    message: errors.length > 0 ? errors.join(', ') : undefined
  };
}

/**
 * Validate video duration
 */
export function validateVideoDuration(
  duration: number
): { valid: boolean; message?: string } {
  if (duration > VIDEO_DURATION_LIMITS.max) {
    return {
      valid: false,
      message: `Video duration exceeds maximum of ${VIDEO_DURATION_LIMITS.max} seconds`
    };
  }
  
  if (duration < VIDEO_DURATION_LIMITS.min) {
    return {
      valid: false,
      message: `Video duration is below minimum of ${VIDEO_DURATION_LIMITS.min} seconds`
    };
  }
  
  return { valid: true };
}

/**
 * Validate file name
 */
export function validateFileName(
  fileName: string
): { valid: boolean; sanitized: string; message?: string } {
  // Remove path traversal attempts
  let sanitized = fileName.replace(/\.\./g, '');
  
  // Remove special characters that might cause issues
  sanitized = sanitized.replace(/[<>:"|?*\/\\]/g, '_');
  
  // Limit length
  if (sanitized.length > 255) {
    sanitized = sanitized.substring(0, 255);
  }
  
  // Ensure it's not empty
  if (!sanitized || sanitized.trim().length === 0) {
    return {
      valid: false,
      sanitized: 'unnamed_file',
      message: 'File name cannot be empty'
    };
  }
  
  return {
    valid: true,
    sanitized
  };
}

/**
 * Validate file extension matches MIME type
 */
export function validateFileExtension(
  fileName: string,
  mimeType: string
): { valid: boolean; message?: string } {
  const extension = fileName.split('.').pop()?.toLowerCase();
  
  if (!extension) {
    return {
      valid: false,
      message: 'File must have an extension'
    };
  }
  
  const mimeExtensionMap: { [key: string]: string[] } = {
    'image/jpeg': ['jpg', 'jpeg'],
    'image/png': ['png'],
    'image/gif': ['gif'],
    'image/webp': ['webp'],
    'image/svg+xml': ['svg'],
    'image/bmp': ['bmp'],
    'image/x-icon': ['ico'],
    'video/mp4': ['mp4'],
    'video/mpeg': ['mpeg', 'mpg'],
    'video/webm': ['webm'],
    'video/quicktime': ['mov'],
    'video/x-msvideo': ['avi'],
    'application/pdf': ['pdf'],
    'text/plain': ['txt'],
    'text/csv': ['csv'],
    'application/json': ['json'],
    'application/xml': ['xml'],
    'text/xml': ['xml'],
  };
  
  const allowedExtensions = mimeExtensionMap[mimeType.toLowerCase()];
  
  if (!allowedExtensions) {
    return { valid: true }; // Allow if we don't have a mapping
  }
  
  if (!allowedExtensions.includes(extension)) {
    return {
      valid: false,
      message: `File extension .${extension} doesn't match MIME type ${mimeType}`
    };
  }
  
  return { valid: true };
}

/**
 * Format bytes to human readable format
 */
function formatBytes(bytes: number): string {
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  if (bytes === 0) return '0 Bytes';
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
}

/**
 * Pre-save validation for file documents
 */
export async function validateFile(this: IFile): Promise<void> {
  // Validate MIME type
  if (!validateMimeType(this.mimeType)) {
    throw new Error(`Invalid MIME type: ${this.mimeType}`);
  }
  
  // Validate file size
  const sizeValidation = validateFileSize(this.size, this.mimeType);
  if (!sizeValidation.valid) {
    throw new Error(sizeValidation.message);
  }
  
  // Validate file name
  const nameValidation = validateFileName(this.originalName);
  if (!nameValidation.valid) {
    throw new Error(nameValidation.message);
  }
  
  // Update the original name with sanitized version
  this.originalName = nameValidation.sanitized;
  
  // Validate image dimensions if applicable
  if (this.isImage && this.originalDimensions) {
    const dimensionValidation = validateImageDimensions(
      this.originalDimensions.width,
      this.originalDimensions.height
    );
    if (!dimensionValidation.valid) {
      throw new Error(dimensionValidation.message);
    }
  }
  
  // Validate video duration if applicable
  if (this.isVideo && this.videoMetadata?.duration) {
    const durationValidation = validateVideoDuration(this.videoMetadata.duration);
    if (!durationValidation.valid) {
      throw new Error(durationValidation.message);
    }
  }
}