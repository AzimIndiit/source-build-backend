import sharp from 'sharp';
import logger from '@config/logger.js';

export interface ImageDimensions {
  width: number;
  height: number;
}

export interface ProcessedImage {
  buffer: Buffer;
  mimeType: string;
  size: number;
  dimensions: ImageDimensions;
  originalDimensions?: ImageDimensions;
  extension: string;
  compressionRatio?: string;
}

export interface ImageVariants {
  compressed?: ProcessedImage;
  thumbnail?: ProcessedImage;
  original?: ProcessedImage;
}

export interface ImageProcessingOptions {
  createThumbnail?: boolean;
  thumbnailSize?: { width: number; height: number };
  compressOriginal?: boolean;
  keepOriginal?: boolean;
  convertToWebP?: boolean;
  quality?: number;
  maxWidth?: number;
  maxHeight?: number;
}

class ImageProcessingService {
  private readonly supportedFormats = [
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
  ];

  private readonly maxImageSize = 20 * 1024 * 1024; // 20MB
  private readonly maxDimensions = { width: 4096, height: 4096 };

  /**
   * Check if the file is an image
   */
  isImage(mimeType: string): boolean {
    return this.supportedFormats.includes(mimeType.toLowerCase());
  }

  /**
   * Validate image constraints
   */
  async validateImageConstraints(buffer: Buffer, mimeType: string): Promise<void> {
    if (!this.isImage(mimeType)) {
      throw new Error(`Unsupported image format: ${mimeType}`);
    }

    if (buffer.length > this.maxImageSize) {
      throw new Error(`Image size exceeds maximum allowed size of ${this.maxImageSize / (1024 * 1024)}MB`);
    }

    // Skip dimension validation for SVG files
    if (mimeType === 'image/svg+xml') {
      return;
    }

    try {
      const metadata = await sharp(buffer).metadata();
      
      if (!metadata.width || !metadata.height) {
        throw new Error('Unable to read image dimensions');
      }

      if (metadata.width > this.maxDimensions.width || metadata.height > this.maxDimensions.height) {
        throw new Error(
          `Image dimensions (${metadata.width}x${metadata.height}) exceed maximum allowed dimensions (${this.maxDimensions.width}x${this.maxDimensions.height})`
        );
      }
    } catch (error) {
      logger.error('Image validation error:', error);
      throw error;
    }
  }

  /**
   * Process a single image with options
   */
  async processImage(
    buffer: Buffer,
    mimeType: string,
    options: ImageProcessingOptions = {}
  ): Promise<ProcessedImage> {
    try {
      // SVG files don't need processing
      if (mimeType === 'image/svg+xml') {
        return {
          buffer,
          mimeType,
          size: buffer.length,
          dimensions: { width: 0, height: 0 }, // SVG is scalable
          extension: 'svg',
        };
      }

      const sharpInstance = sharp(buffer);
      const metadata = await sharpInstance.metadata();
      
      const originalDimensions: ImageDimensions = {
        width: metadata.width || 0,
        height: metadata.height || 0,
      };

      let processedSharp = sharpInstance.rotate(); // Auto-rotate based on EXIF

      // Resize if max dimensions are specified
      if (options.maxWidth || options.maxHeight) {
        processedSharp = processedSharp.resize(
          options.maxWidth,
          options.maxHeight,
          {
            fit: 'inside',
            withoutEnlargement: true,
          }
        );
      }

      // Convert to WebP if requested
      let outputFormat = metadata.format || 'jpeg';
      let outputMimeType = mimeType;
      
      if (options.convertToWebP !== false && mimeType !== 'image/gif' && mimeType !== 'image/svg+xml') {
        outputFormat = 'webp';
        outputMimeType = 'image/webp';
        processedSharp = processedSharp.webp({
          quality: options.quality || 85,
          effort: 4, // Balance between compression and speed
        });
      } else if (mimeType.includes('jpeg') || mimeType.includes('jpg')) {
        processedSharp = processedSharp.jpeg({
          quality: options.quality || 85,
          progressive: true,
        });
      } else if (mimeType.includes('png')) {
        processedSharp = processedSharp.png({
          compressionLevel: 8,
          progressive: true,
        });
      }

      const processedBuffer = await processedSharp.toBuffer();
      const processedMetadata = await sharp(processedBuffer).metadata();

      return {
        buffer: processedBuffer,
        mimeType: outputMimeType,
        size: processedBuffer.length,
        dimensions: {
          width: processedMetadata.width || 0,
          height: processedMetadata.height || 0,
        },
        originalDimensions,
        extension: outputFormat,
        compressionRatio: `${Math.round((1 - processedBuffer.length / buffer.length) * 100)}%`,
      };
    } catch (error) {
      logger.error('Image processing error:', error);
      throw error;
    }
  }

  /**
   * Generate multiple image variants
   */
  async generateImageVariants(
    buffer: Buffer,
    mimeType: string,
    options: ImageProcessingOptions = {}
  ): Promise<ImageVariants> {
    const variants: ImageVariants = {};

    // SVG files don't need variants
    if (mimeType === 'image/svg+xml') {
      return {
        original: {
          buffer,
          mimeType,
          size: buffer.length,
          dimensions: { width: 0, height: 0 },
          extension: 'svg',
        }
      };
    }

    try {
      // Generate compressed version
      if (options.compressOriginal !== false) {
        variants.compressed = await this.processImage(buffer, mimeType, {
          convertToWebP: true,
          quality: options.quality || 85,
          maxWidth: options.maxWidth || 2048,
          maxHeight: options.maxHeight || 2048,
        });
      }

      // Generate thumbnail
      if (options.createThumbnail) {
        const thumbnailSize = options.thumbnailSize || { width: 300, height: 300 };
        
        const thumbnailSharp = sharp(buffer)
          .resize(thumbnailSize.width, thumbnailSize.height, {
            fit: 'cover',
            position: 'center',
          })
          .webp({ quality: 80 });

        const thumbnailBuffer = await thumbnailSharp.toBuffer();
        const thumbnailMetadata = await sharp(thumbnailBuffer).metadata();

        variants.thumbnail = {
          buffer: thumbnailBuffer,
          mimeType: 'image/webp',
          size: thumbnailBuffer.length,
          dimensions: {
            width: thumbnailMetadata.width || 0,
            height: thumbnailMetadata.height || 0,
          },
          extension: 'webp',
        };
      }

      // Keep original if requested
      if (options.keepOriginal) {
        const metadata = await sharp(buffer).metadata();
        variants.original = {
          buffer,
          mimeType,
          size: buffer.length,
          dimensions: {
            width: metadata.width || 0,
            height: metadata.height || 0,
          },
          extension: metadata.format || 'unknown',
        };
      }

      return variants;
    } catch (error) {
      logger.error('Image variant generation error:', error);
      throw error;
    }
  }

  /**
   * Extract image metadata
   */
  async getImageMetadata(buffer: Buffer): Promise<sharp.Metadata> {
    try {
      return await sharp(buffer).metadata();
    } catch (error) {
      logger.error('Failed to extract image metadata:', error);
      throw error;
    }
  }

  /**
   * Optimize image for web
   */
  async optimizeForWeb(buffer: Buffer, mimeType: string): Promise<ProcessedImage> {
    return this.processImage(buffer, mimeType, {
      convertToWebP: true,
      quality: 85,
      maxWidth: 1920,
      maxHeight: 1080,
    });
  }

  /**
   * Create a placeholder image (blur hash or low quality)
   */
  async createPlaceholder(buffer: Buffer): Promise<ProcessedImage> {
    try {
      const placeholderSharp = sharp(buffer)
        .resize(20, 20, { fit: 'inside' })
        .blur(5)
        .webp({ quality: 20 });

      const placeholderBuffer = await placeholderSharp.toBuffer();
      const metadata = await sharp(placeholderBuffer).metadata();

      return {
        buffer: placeholderBuffer,
        mimeType: 'image/webp',
        size: placeholderBuffer.length,
        dimensions: {
          width: metadata.width || 0,
          height: metadata.height || 0,
        },
        extension: 'webp',
      };
    } catch (error) {
      logger.error('Placeholder generation error:', error);
      throw error;
    }
  }
}

export default new ImageProcessingService();