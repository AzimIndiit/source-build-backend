import { Router } from 'express';
import fileController from '@controllers/file.controller.js';
import { uploadMiddleware, uploadArray } from '@middlewares/upload.middleware.js';
import { authenticate, optionalAuthenticate } from '@middlewares/auth.middleware.js';

const router = Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     FileVariant:
 *       type: object
 *       properties:
 *         url:
 *           type: string
 *           description: URL of the file variant
 *         size:
 *           type: number
 *           description: Size of the variant in bytes
 *         dimensions:
 *           type: object
 *           properties:
 *             width:
 *               type: number
 *             height:
 *               type: number
 *     
 *     File:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           description: File ID
 *         filename:
 *           type: string
 *           description: Original filename
 *         originalName:
 *           type: string
 *           description: Original name of the file
 *         mimeType:
 *           type: string
 *           description: MIME type of the file
 *         size:
 *           type: number
 *           description: File size in bytes
 *         humanReadableSize:
 *           type: string
 *           description: Human readable file size
 *         url:
 *           type: string
 *           description: File URL
 *         thumbnailUrl:
 *           type: string
 *           description: Thumbnail URL for images/videos
 *         bestImageUrl:
 *           type: string
 *           description: Best quality image URL
 *         uploadedAt:
 *           type: string
 *           format: date-time
 *         uploadedBy:
 *           type: object
 *           properties:
 *             _id:
 *               type: string
 *             email:
 *               type: string
 *             profile:
 *               type: object
 *               properties:
 *                 displayName:
 *                   type: string
 *         isImage:
 *           type: boolean
 *         isVideo:
 *           type: boolean
 *         isProcessed:
 *           type: boolean
 *         dimensions:
 *           type: object
 *           properties:
 *             width:
 *               type: number
 *             height:
 *               type: number
 *         duration:
 *           type: number
 *           description: Video duration in seconds
 *         formattedDuration:
 *           type: string
 *           description: Formatted video duration
 *         variants:
 *           type: object
 *           properties:
 *             compressed:
 *               $ref: '#/components/schemas/FileVariant'
 *             thumbnail:
 *               $ref: '#/components/schemas/FileVariant'
 *             high:
 *               $ref: '#/components/schemas/FileVariant'
 *             medium:
 *               $ref: '#/components/schemas/FileVariant'
 *             low:
 *               $ref: '#/components/schemas/FileVariant'
 *       required:
 *         - id
 *         - filename
 *         - mimeType
 *         - size
 *         - url
 *     
 *     FileUploadResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *         data:
 *           $ref: '#/components/schemas/File'
 *         message:
 *           type: string
 *     
 *     MultipleFileUploadResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *         data:
 *           type: object
 *           properties:
 *             files:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/File'
 *             meta:
 *               type: object
 *               properties:
 *                 total:
 *                   type: number
 *                 uploaded:
 *                   type: number
 *                 failed:
 *                   type: number
 *                 images:
 *                   type: number
 *                 videos:
 *                   type: number
 *                 documents:
 *                   type: number
 *         message:
 *           type: string
 *     
 *     FileListResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *         data:
 *           type: object
 *           properties:
 *             files:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/File'
 *             pagination:
 *               type: object
 *               properties:
 *                 page:
 *                   type: number
 *                 limit:
 *                   type: number
 *                 total:
 *                   type: number
 *                 pages:
 *                   type: number
 *                 hasNext:
 *                   type: boolean
 *                 hasPrev:
 *                   type: boolean
 *             meta:
 *               type: object
 *               properties:
 *                 images:
 *                   type: number
 *                 videos:
 *                   type: number
 *                 documents:
 *                   type: number
 *         message:
 *           type: string
 *     
 *     UserFilesResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *         data:
 *           type: object
 *           properties:
 *             files:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/File'
 *             pagination:
 *               type: object
 *               properties:
 *                 page:
 *                   type: number
 *                 limit:
 *                   type: number
 *                 total:
 *                   type: number
 *                 pages:
 *                   type: number
 *                 hasNext:
 *                   type: boolean
 *                 hasPrev:
 *                   type: boolean
 *             storage:
 *               type: object
 *               properties:
 *                 used:
 *                   type: number
 *                   description: Storage used in bytes
 *                 humanReadable:
 *                   type: string
 *                   description: Human readable storage used
 *                 limit:
 *                   type: number
 *                   description: Storage limit in bytes
 *                 percentUsed:
 *                   type: number
 *                   description: Percentage of storage used
 *             meta:
 *               type: object
 *               properties:
 *                 totalFiles:
 *                   type: number
 *                 images:
 *                   type: number
 *                 videos:
 *                   type: number
 *                 documents:
 *                   type: number
 *         message:
 *           type: string
 * 
 * tags:
 *   - name: Files
 *     description: File upload and management endpoints
 */

/**
 * @swagger
 * /api/v1/upload:
 *   post:
 *     summary: Upload a single file
 *     description: Universal file upload endpoint that supports images, videos, and documents with automatic processing
 *     tags: [Files]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: File to upload (image, video, or document)
 *             required:
 *               - file
 *     responses:
 *       201:
 *         description: File uploaded successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/FileUploadResponse'
 *             example:
 *               success: true
 *               data:
 *                 id: "507f1f77bcf86cd799439011"
 *                 filename: "example.jpg"
 *                 originalName: "example.jpg"
 *                 mimeType: "image/jpeg"
 *                 size: 1048576
 *                 humanReadableSize: "1 MB"
 *                 url: "https://example.s3.amazonaws.com/example.jpg"
 *                 thumbnailUrl: "https://example.s3.amazonaws.com/example-thumb.jpg"
 *                 bestImageUrl: "https://example.s3.amazonaws.com/example-compressed.webp"
 *                 uploadedAt: "2024-01-20T10:30:00Z"
 *                 isImage: true
 *                 isVideo: false
 *                 isProcessed: true
 *                 dimensions:
 *                   width: 1920
 *                   height: 1080
 *                 variants:
 *                   compressed:
 *                     url: "https://example.s3.amazonaws.com/example-compressed.webp"
 *                     size: 524288
 *                     dimensions:
 *                       width: 1920
 *                       height: 1080
 *                   thumbnail:
 *                     url: "https://example.s3.amazonaws.com/example-thumb.jpg"
 *                     size: 102400
 *                     dimensions:
 *                       width: 200
 *                       height: 200
 *               message: "File uploaded successfully"
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       413:
 *         description: File too large
 *       415:
 *         description: Unsupported media type
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.post(
  '/',
  optionalAuthenticate,
  uploadMiddleware('file'),
  fileController.handlePost
);

/**
 * @swagger
 * /api/v1/upload/multiple:
 *   post:
 *     summary: Upload multipletiple files
 *     description: Upload multiple files at once (maximum 10 files)
 *     tags: [Files]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               files:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *                 maxItems: 10
 *                 description: Files to upload (max 10)
 *             required:
 *               - files
 *     responses:
 *       201:
 *         description: Files uploaded successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/MultipleFileUploadResponse'
 *             example:
 *               success: true
 *               data:
 *                 files:
 *                   - id: "507f1f77bcf86cd799439011"
 *                     filename: "image1.jpg"
 *                     mimeType: "image/jpeg"
 *                     size: 1048576
 *                     url: "https://example.s3.amazonaws.com/image1.jpg"
 *                     isImage: true
 *                   - id: "507f1f77bcf86cd799439012"
 *                     filename: "document.pdf"
 *                     mimeType: "application/pdf"
 *                     size: 2097152
 *                     url: "https://example.s3.amazonaws.com/document.pdf"
 *                     isImage: false
 *                 meta:
 *                   total: 2
 *                   uploaded: 2
 *                   failed: 0
 *                   images: 1
 *                   videos: 0
 *                   documents: 1
 *               message: "Files uploaded successfully"
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       413:
 *         description: File too large
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.post(
  '/multiple',
  authenticate,
  uploadArray('files', 10),
  fileController.handlePost
);

/**
 * @swagger
 * /api/v1/upload:
 *   get:
 *     summary: Get all files
 *     description: Get all files with pagination and filtering options
 *     tags: [Files]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of items per page
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [image, video, document]
 *         description: Filter by file type
 *       - in: query
 *         name: userId
 *         schema:
 *           type: string
 *         description: Filter by user ID
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           default: createdAt
 *         description: Sort field
 *       - in: query
 *         name: order
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: desc
 *         description: Sort order
 *     responses:
 *       200:
 *         description: Files retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/FileListResponse'
 *             example:
 *               success: true
 *               data:
 *                 files:
 *                   - id: "507f1f77bcf86cd799439011"
 *                     filename: "example.jpg"
 *                     mimeType: "image/jpeg"
 *                     size: 1048576
 *                     humanReadableSize: "1 MB"
 *                     url: "https://example.s3.amazonaws.com/example.jpg"
 *                     thumbnailUrl: "https://example.s3.amazonaws.com/example-thumb.jpg"
 *                     uploadedAt: "2024-01-20T10:30:00Z"
 *                     isImage: true
 *                     isVideo: false
 *                 pagination:
 *                   page: 1
 *                   limit: 10
 *                   total: 50
 *                   pages: 5
 *                   hasNext: true
 *                   hasPrev: false
 *                 meta:
 *                   images: 25
 *                   videos: 10
 *                   documents: 15
 *               message: "Files retrieved successfully"
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.get(
  '/',
  authenticate,
  fileController.handleGet
);

/**
 * @swagger
 * /api/v1/upload/my-files:
 *   get:
 *     summary: Get current user's files
 *     description: Get all files uploaded by the authenticated user with storage information
 *     tags: [Files]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of items per page
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [image, video, document]
 *         description: Filter by file type
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           default: createdAt
 *         description: Sort field
 *       - in: query
 *         name: order
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: desc
 *         description: Sort order
 *     responses:
 *       200:
 *         description: User files retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UserFilesResponse'
 *             example:
 *               success: true
 *               data:
 *                 files:
 *                   - id: "507f1f77bcf86cd799439011"
 *                     filename: "my-photo.jpg"
 *                     mimeType: "image/jpeg"
 *                     size: 1048576
 *                     humanReadableSize: "1 MB"
 *                     url: "https://example.s3.amazonaws.com/my-photo.jpg"
 *                     uploadedAt: "2024-01-20T10:30:00Z"
 *                     isImage: true
 *                 pagination:
 *                   page: 1
 *                   limit: 10
 *                   total: 15
 *                   pages: 2
 *                   hasNext: true
 *                   hasPrev: false
 *                 storage:
 *                   used: 157286400
 *                   humanReadable: "150 MB"
 *                   limit: 10737418240
 *                   percentUsed: 1.5
 *                 meta:
 *                   totalFiles: 15
 *                   images: 10
 *                   videos: 2
 *                   documents: 3
 *               message: "User files retrieved successfully"
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.get(
  '/my-files',
  authenticate,
  fileController.handleGet
);

/**
 * @swagger
 * /api/v1/upload/{id}:
 *   get:
 *     summary: Get file by ID
 *     description: Get detailed information about a specific file
 *     tags: [Files]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: File ID
 *     responses:
 *       200:
 *         description: File retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/File'
 *                 message:
 *                   type: string
 *             example:
 *               success: true
 *               data:
 *                 id: "507f1f77bcf86cd799439011"
 *                 filename: "example-video.mp4"
 *                 mimeType: "video/mp4"
 *                 size: 10485760
 *                 humanReadableSize: "10 MB"
 *                 url: "https://example.s3.amazonaws.com/example-video.mp4"
 *                 thumbnailUrl: "https://example.s3.amazonaws.com/example-video-thumb.jpg"
 *                 uploadedAt: "2024-01-20T10:30:00Z"
 *                 uploadedBy:
 *                   _id: "507f1f77bcf86cd799439099"
 *                   email: "user@example.com"
 *                   profile:
 *                     displayName: "John Doe"
 *                 isImage: false
 *                 isVideo: true
 *                 isProcessed: true
 *                 dimensions:
 *                   width: 1920
 *                   height: 1080
 *                 duration: 120
 *                 formattedDuration: "2:00"
 *                 variants:
 *                   high:
 *                     url: "https://example.s3.amazonaws.com/example-video-high.mp4"
 *                     size: 8388608
 *                   medium:
 *                     url: "https://example.s3.amazonaws.com/example-video-medium.mp4"
 *                     size: 5242880
 *                   low:
 *                     url: "https://example.s3.amazonaws.com/example-video-low.mp4"
 *                     size: 2097152
 *                   thumbnail:
 *                     url: "https://example.s3.amazonaws.com/example-video-thumb.jpg"
 *                     size: 51200
 *               message: "File retrieved successfully"
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.get(
  '/:id',
  fileController.handleGet
);

/**
 * @swagger
 * /api/v1/upload/{id}:
 *   delete:
 *     summary: Delete file
 *     description: Delete a file by ID. Only the file owner or admin can delete files.
 *     tags: [Files]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: File ID to delete
 *     responses:
 *       200:
 *         description: File deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: null
 *                 message:
 *                   type: string
 *             example:
 *               success: true
 *               data: null
 *               message: "File deleted successfully"
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         description: Forbidden - not authorized to delete this file
 *         content:
 *           application/json:
 *             example:
 *               success: false
 *               error:
 *                 message: "You are not authorized to delete this file"
 *                 code: "FORBIDDEN"
 *                 statusCode: 403
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.delete(
  '/:id',
  authenticate,
  fileController.handleDelete
);

export default router;