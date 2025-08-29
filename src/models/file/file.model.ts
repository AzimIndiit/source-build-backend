import mongoose from 'mongoose';
import { IFile, IFileModel } from './file.types.js';
import { fileSchema, createFileIndexes } from './file.schemas.js';
import * as methods from './file.methods.js';
import * as statics from './file.statics.js';
import { validateFile } from './file.validators.js';

// Apply indexes
createFileIndexes(fileSchema);

// Virtual properties
fileSchema.virtual('bestMediaUrl').get(methods.getBestMediaUrl);
fileSchema.virtual('bestImageUrl').get(methods.getBestImageUrl);
fileSchema.virtual('thumbnailUrl').get(methods.getThumbnailUrl);
fileSchema.virtual('streamingUrl').get(methods.getStreamingUrl);

// Instance methods
const methodsObj = fileSchema.methods as any;
methodsObj.getHumanReadableSize = methods.getHumanReadableSize;
methodsObj.isProcessed = methods.isProcessed;
methodsObj.getFormattedDuration = methods.getFormattedDuration;
methodsObj.getAvailableQualities = methods.getAvailableQualities;
methodsObj.getBestMediaUrl = methods.getBestMediaUrl;
methodsObj.getBestImageUrl = methods.getBestImageUrl;
methodsObj.getThumbnailUrl = methods.getThumbnailUrl;
methodsObj.getStreamingUrl = methods.getStreamingUrl;
methodsObj.isImageFile = methods.isImageFile;
methodsObj.isVideoFile = methods.isVideoFile;
methodsObj.isDocumentFile = methods.isDocumentFile;
methodsObj.getFileExtension = methods.getFileExtension;
methodsObj.getFileNameWithoutExtension = methods.getFileNameWithoutExtension;

// Static methods
const staticsObj = fileSchema.statics as any;
staticsObj.findImages = statics.findImages;
staticsObj.findVideos = statics.findVideos;
staticsObj.findMedia = statics.findMedia;
staticsObj.findByUploader = statics.findByUploader;
staticsObj.findUnprocessed = statics.findUnprocessed;
staticsObj.getTotalStorageByUser = statics.getTotalStorageByUser;
staticsObj.getStorageStats = statics.getStorageStats;
staticsObj.deleteExpiredFiles = statics.deleteExpiredFiles;
staticsObj.findDuplicates = statics.findDuplicates;
staticsObj.getFileTypeDistribution = statics.getFileTypeDistribution;

// Pre-save validation
fileSchema.pre('save', validateFile);

// Create and export the model
const FileModal = mongoose.model<IFile, IFileModel>('File', fileSchema);

export default FileModal;
export type { IFile, IFileModel } from './file.types.js';
export * from './file.validators.js';