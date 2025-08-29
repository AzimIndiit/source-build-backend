import { Model, Types } from 'mongoose';
import { IFile } from './file.types.js';

/**
 * Find images only
 */
export async function findImages(
  this: Model<IFile>,
  filter: any = {}
): Promise<IFile[]> {
  return this.find({ ...filter, isImage: true });
}

/**
 * Find videos only
 */
export async function findVideos(
  this: Model<IFile>,
  filter: any = {}
): Promise<IFile[]> {
  return this.find({ ...filter, isVideo: true });
}

/**
 * Find media files (images and videos)
 */
export async function findMedia(
  this: Model<IFile>,
  filter: any = {}
): Promise<IFile[]> {
  return this.find({ 
    ...filter, 
    $or: [{ isImage: true }, { isVideo: true }] 
  });
}

/**
 * Find files by uploader
 */
export async function findByUploader(
  this: Model<IFile>,
  userId: string | Types.ObjectId
): Promise<IFile[]> {
  const id = typeof userId === 'string' ? new Types.ObjectId(userId) : userId;
  return this.find({ uploadedBy: id }).sort({ createdAt: -1 });
}

/**
 * Find unprocessed files
 */
export async function findUnprocessed(
  this: Model<IFile>
): Promise<IFile[]> {
  return this.find({
    $or: [
      {
        isImage: true,
        'variants.compressed': { $exists: false }
      },
      {
        isVideo: true,
        $and: [
          { 'variants.high': { $exists: false } },
          { 'variants.medium': { $exists: false } },
          { 'variants.low': { $exists: false } }
        ]
      }
    ]
  }).sort({ createdAt: -1 });
}

/**
 * Get total storage used by a user
 */
export async function getTotalStorageByUser(
  this: Model<IFile>,
  userId: string | Types.ObjectId
): Promise<number> {
  const id = typeof userId === 'string' ? new Types.ObjectId(userId) : userId;
  
  const result = await this.aggregate([
    { $match: { uploadedBy: id } },
    { 
      $group: { 
        _id: null, 
        totalSize: { $sum: '$size' } 
      } 
    }
  ]);
  
  return result[0]?.totalSize || 0;
}

/**
 * Get storage statistics for a user
 */
export async function getStorageStats(
  this: Model<IFile>,
  userId: string | Types.ObjectId
): Promise<{
  totalSize: number;
  totalFiles: number;
  imageCount: number;
  videoCount: number;
  documentCount: number;
  averageFileSize: number;
  largestFile: IFile | null;
}> {
  const id = typeof userId === 'string' ? new Types.ObjectId(userId) : userId;
  
  const [stats, largestFile] = await Promise.all([
    this.aggregate([
      { $match: { uploadedBy: id } },
      { 
        $group: { 
          _id: null,
          totalSize: { $sum: '$size' },
          totalFiles: { $sum: 1 },
          imageCount: { 
            $sum: { $cond: ['$isImage', 1, 0] } 
          },
          videoCount: { 
            $sum: { $cond: ['$isVideo', 1, 0] } 
          },
          documentCount: { 
            $sum: { 
              $cond: [
                { $and: [
                  { $eq: ['$isImage', false] },
                  { $eq: ['$isVideo', false] }
                ]},
                1,
                0
              ] 
            } 
          },
          averageFileSize: { $avg: '$size' }
        } 
      }
    ]),
    this.findOne({ uploadedBy: id }).sort({ size: -1 })
  ]);
  
  const result = stats[0] || {
    totalSize: 0,
    totalFiles: 0,
    imageCount: 0,
    videoCount: 0,
    documentCount: 0,
    averageFileSize: 0
  };
  
  return {
    ...result,
    largestFile
  };
}

/**
 * Delete expired files (older than specified days)
 */
export async function deleteExpiredFiles(
  this: Model<IFile>,
  days: number = 30
): Promise<{ deletedCount: number }> {
  const expirationDate = new Date();
  expirationDate.setDate(expirationDate.getDate() - days);
  
  const result = await this.deleteMany({
    createdAt: { $lt: expirationDate }
  });
  
  return { deletedCount: result.deletedCount || 0 };
}

/**
 * Find duplicate files by hash or name
 */
export async function findDuplicates(
  this: Model<IFile>,
  userId?: string | Types.ObjectId
): Promise<Array<{ originalName: string; count: number; files: IFile[] }>> {
  const match: any = {};
  
  if (userId) {
    const id = typeof userId === 'string' ? new Types.ObjectId(userId) : userId;
    match.uploadedBy = id;
  }
  
  const duplicates = await this.aggregate([
    { $match: match },
    {
      $group: {
        _id: '$originalName',
        count: { $sum: 1 },
        files: { $push: '$$ROOT' }
      }
    },
    { $match: { count: { $gt: 1 } } },
    { $sort: { count: -1 } },
    {
      $project: {
        originalName: '$_id',
        count: 1,
        files: 1,
        _id: 0
      }
    }
  ]);
  
  return duplicates;
}

/**
 * Get file type distribution
 */
export async function getFileTypeDistribution(
  this: Model<IFile>,
  userId?: string | Types.ObjectId
): Promise<Array<{ mimeType: string; count: number; totalSize: number }>> {
  const match: any = {};
  
  if (userId) {
    const id = typeof userId === 'string' ? new Types.ObjectId(userId) : userId;
    match.uploadedBy = id;
  }
  
  const distribution = await this.aggregate([
    { $match: match },
    {
      $group: {
        _id: '$mimeType',
        count: { $sum: 1 },
        totalSize: { $sum: '$size' }
      }
    },
    { $sort: { count: -1 } },
    {
      $project: {
        mimeType: '$_id',
        count: 1,
        totalSize: 1,
        _id: 0
      }
    }
  ]);
  
  return distribution;
}