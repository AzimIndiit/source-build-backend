// @ts-nocheck
import { Request, Response } from 'express';
import CmsContent, { ContentType, ICmsContent } from '@models/cms/cms.model.js';
import { createCmsContentSchema, updateCmsContentSchema } from '@models/cms/cms.validators.js';
import { IUser } from '@models/user/user.types.js';
import ApiError from '@utils/ApiError.js';
import catchAsync from '@utils/catchAsync.js';
import logger from '@config/logger.js';

/**
 * Create or update CMS content for a seller
 */
export const upsertCmsContent = catchAsync(async (req: Request, res: Response) => {
  const userId = req.userId;
  const user = req.user as IUser;

  if (!userId || !user) {
    throw ApiError.unauthorized('User not authenticated');
  }

  // Only sellers can manage CMS content
  if (user.role !== 'seller') {
    throw ApiError.forbidden('Only sellers can manage CMS content');
  }

  const validatedData = createCmsContentSchema.parse(req.body);

  // Check if content already exists for this user and type
  const existingContent = await CmsContent.findOne({
    userId,
    type: validatedData.type,
  });

  let content: ICmsContent;

  if (existingContent) {
    // Update existing content
    existingContent.title = validatedData.title;
    existingContent.content = validatedData.content;
    existingContent.isActive = validatedData.isActive ?? existingContent.isActive;
    existingContent.lastUpdated = new Date();
    
    content = await existingContent.save();
    
    logger.info('CMS content updated', { userId, type: validatedData.type });
    
    res.status(200).json({
      success: true,
      message: 'Content updated successfully',
      data: content,
    });
  } else {
    // Create new content
    content = await CmsContent.create({
      userId,
      type: validatedData.type,
      title: validatedData.title,
      content: validatedData.content,
      isActive: validatedData.isActive,
    });
    
    logger.info('CMS content created', { userId, type: validatedData.type });
    
    res.status(201).json({
      success: true,
      message: 'Content created successfully',
      data: content,
    });
  }
});

/**
 * Get CMS content for a seller
 */
export const getCmsContent = catchAsync(async (req: Request, res: Response) => {
  const userId = req.userId;
  const user = req.user as IUser;
  const { type } = req.params;

  if (!userId || !user) {
    throw ApiError.unauthorized('User not authenticated');
  }

  // Only sellers can get their own CMS content through this endpoint
  if (user.role !== 'seller') {
    throw ApiError.forbidden('Only sellers can access this endpoint');
  }

  // Validate content type
  if (!Object.values(ContentType).includes(type as ContentType)) {
    throw ApiError.badRequest('Invalid content type');
  }

  const content = await CmsContent.findOne({
    userId,
    type: type as ContentType,
  });

  res.status(200).json({
    success: true,
    data: content,
  });
});

/**
 * Get all CMS content for a seller
 */
export const getAllCmsContent = catchAsync(async (req: Request, res: Response) => {
  const userId = req.userId;
  const user = req.user as IUser;

  if (!userId || !user) {
    throw ApiError.unauthorized('User not authenticated');
  }

  // Only sellers can get their CMS content
  // if (user.role !== 'seller') {
  //   throw ApiError.forbidden('Only sellers can access this endpoint');
  // }

  const contents = await CmsContent.find({ userId });

  res.status(200).json({
    success: true,
    data: contents,
  });
});

/**
 * Update CMS content
 */
export const updateCmsContent = catchAsync(async (req: Request, res: Response) => {
  const userId = req.userId;
  const user = req.user as IUser;
  const { type } = req.params;

  if (!userId || !user) {
    throw ApiError.unauthorized('User not authenticated');
  }

  // Only sellers can update CMS content
  if (user.role !== 'seller') {
    throw ApiError.forbidden('Only sellers can manage CMS content');
  }

  // Validate content type
  if (!Object.values(ContentType).includes(type as ContentType)) {
    throw ApiError.badRequest('Invalid content type');
  }

  const validatedData = updateCmsContentSchema.parse(req.body);

  const content = await CmsContent.findOneAndUpdate(
    {
      userId,
      type: type as ContentType,
    },
    {
      ...validatedData,
      lastUpdated: new Date(),
    },
    {
      new: true,
      runValidators: true,
    }
  );

  if (!content) {
    throw ApiError.notFound('Content not found');
  }

  logger.info('CMS content updated', { userId, type });

  res.status(200).json({
    success: true,
    message: 'Content updated successfully',
    data: content,
  });
});

/**
 * Delete CMS content
 */
export const deleteCmsContent = catchAsync(async (req: Request, res: Response) => {
  const userId = req.userId;
  const user = req.user as IUser;
  const { type } = req.params;

  if (!userId || !user) {
    throw ApiError.unauthorized('User not authenticated');
  }

  // Only sellers can delete CMS content
  if (user.role !== 'seller') {
    throw ApiError.forbidden('Only sellers can manage CMS content');
  }

  // Validate content type
  if (!Object.values(ContentType).includes(type as ContentType)) {
    throw ApiError.badRequest('Invalid content type');
  }

  const content = await CmsContent.findOneAndDelete({
    userId,
    type: type as ContentType,
  });

  if (!content) {
    throw ApiError.notFound('Content not found');
  }

  logger.info('CMS content deleted', { userId, type });

  res.status(200).json({
    success: true,
    message: 'Content deleted successfully',
  });
});

/**
 * Get public CMS content for a seller (for buyers)
 */
export const getPublicCmsContent = catchAsync(async (req: Request, res: Response) => {
  const { sellerId, type } = req.params;

  // Validate content type
  if (!Object.values(ContentType).includes(type as ContentType)) {
    throw ApiError.badRequest('Invalid content type');
  }

  const content = await CmsContent.findOne({
    userId: sellerId,
    type: type as ContentType,
    isActive: true,
  }).select('title content lastUpdated type');

  if (!content) {
    // Return default content if seller hasn't set up their content
    const defaultContent = getDefaultContent(type as ContentType);
    return res.status(200).json({
      success: true,
      data: defaultContent,
    });
  }

  res.status(200).json({
    success: true,
    data: content,
  });
});

/**
 * Get all public CMS content for a seller (for buyers)
 */
export const getAllPublicCmsContent = catchAsync(async (req: Request, res: Response) => {
  const { sellerId } = req.params;

  const contents = await CmsContent.find({
    userId: sellerId,
    isActive: true,
  }).select('title content lastUpdated type');

  // Add default content for missing types
  const contentTypes = contents.map(c => c.type);
  const allTypes = Object.values(ContentType);
  const missingTypes = allTypes.filter(type => !contentTypes.includes(type));

  const allContents = [
    ...contents,
    ...missingTypes.map(type => getDefaultContent(type)),
  ];

  res.status(200).json({
    success: true,
    data: allContents,
  });
});

// Helper function to get default content
function getDefaultContent(type: ContentType) {
  switch (type) {
    case ContentType.TERMS_CONDITIONS:
      return {
        type: ContentType.TERMS_CONDITIONS,
        title: 'Terms & Conditions',
        content: 'No terms and conditions have been set by this seller yet.',
        lastUpdated: new Date(),
      };
    case ContentType.PRIVACY_POLICY:
      return {
        type: ContentType.PRIVACY_POLICY,
        title: 'Privacy Policy',
        content: 'No privacy policy has been set by this seller yet.',
        lastUpdated: new Date(),
      };
    case ContentType.ABOUT_US:
      return {
        type: ContentType.ABOUT_US,
        title: 'About Us',
        content: 'No information about this seller has been provided yet.',
        lastUpdated: new Date(),
      };
    default:
      return {
        type,
        title: 'Content',
        content: 'No content available.',
        lastUpdated: new Date(),
      };
  }
}

export default {
  upsertCmsContent,
  getCmsContent,
  getAllCmsContent,
  updateCmsContent,
  deleteCmsContent,
  getPublicCmsContent,
  getAllPublicCmsContent,
};