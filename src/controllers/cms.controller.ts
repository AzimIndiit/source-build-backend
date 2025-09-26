// @ts-nocheck
import { Request, Response } from 'express'
import CmsContent, { ContentType, ICmsContent } from '@models/cms/cms.model.js'
import { createCmsContentSchema, updateCmsContentSchema } from '@models/cms/cms.validators.js'
import { IUser } from '@models/user/user.types.js'
import ApiError from '@utils/ApiError.js'
import catchAsync from '@utils/catchAsync.js'
import logger from '@config/logger.js'
import { populateLandingPageSections } from '../services/landingPagePopulator.js'

/**
 * Create or update CMS content for a seller
 */
export const upsertCmsContent = catchAsync(async (req: Request, res: Response) => {
  const userId = req.userId
  const user = req.user as IUser

  if (!userId || !user) {
    throw ApiError.unauthorized('User not authenticated')
  }

  // Only sellers can manage CMS content
  if (!['seller', 'admin'].includes(user.role)) {
    throw ApiError.forbidden('Only sellers can manage CMS content')
  }

  const validatedData = createCmsContentSchema.parse(req.body)

  // Check if content already exists for this user and type
  const existingContent = await CmsContent.findOne({
    userId,
    type: validatedData.type,
  })

  let content: ICmsContent

  if (existingContent) {
    // Update existing content
    existingContent.title = validatedData.title
    existingContent.content = validatedData.content
    existingContent.isActive = validatedData.isActive ?? existingContent.isActive
    existingContent.lastUpdated = new Date()

    content = await existingContent.save()

    logger.info('CMS content updated', { userId, type: validatedData.type })

    res.status(200).json({
      success: true,
      message: 'Content updated successfully',
      data: content,
    })
  } else {
    // Create new content
    content = await CmsContent.create({
      userId,
      type: validatedData.type,
      title: validatedData.title,
      content: validatedData.content,
      isActive: validatedData.isActive,
    })

    logger.info('CMS content created', { userId, type: validatedData.type })

    res.status(201).json({
      success: true,
      message: 'Content created successfully',
      data: content,
    })
  }
})

/**
 * Get CMS content for a seller
 */
export const getCmsContent = catchAsync(async (req: Request, res: Response) => {
  const userId = req.userId
  const user = req.user as IUser
  const { type } = req.params

  // Validate content type
  if (!Object.values(ContentType).includes(type as ContentType)) {
    throw ApiError.badRequest('Invalid content type')
  }

  const content = await CmsContent.findOne({
    // userId,
    type: type as ContentType,
  })

  res.status(200).json({
    success: true,
    data: content,
  })
})

/**
 * Get all CMS content for a seller
 */
export const getAllCmsContent = catchAsync(async (req: Request, res: Response) => {
  const userId = req.userId
  const user = req.user as IUser
  const { type } = req.query
  
  let contents: ICmsContent[] = []
  contents = await CmsContent.find({ type: type as ContentType }).lean()

  // Populate landing page sections with actual product/category data
  const populatedContents = await Promise.all(
    contents.map(async (content) => {
      if (content.type === ContentType.LANDING_PAGE && content.sections) {
        const populatedSections = await populateLandingPageSections(content.sections)
        return { ...content, sections: populatedSections }
      }
      return content
    })
  )

  // Return the first item if type is landing_page (for backward compatibility)
  if (type === ContentType.LANDING_PAGE && populatedContents.length > 0) {
    res.status(200).json({
      success: true,
      data: populatedContents[0],
    })
  } else {
    res.status(200).json({
      success: true,
      data: populatedContents,
    })
  }
})

/**
 * Get all CMS pages
 */
export const getAllPages = catchAsync(async (req: Request, res: Response) => {
  const userId = req.userId
  const user = req.user as IUser
  const { populate } = req.query

  if (!userId || !user) {
    throw ApiError.unauthorized('User not authenticated')
  }

  const pages = await CmsContent.find({
    userId,
    type: { $in: [ContentType.PAGE, ContentType.LANDING_PAGE ,ContentType.TERMS_CONDITIONS, ContentType.PRIVACY_POLICY, ContentType.ABOUT_US] },
  }).sort({ updatedAt: -1 }).lean()

  // For admin/seller editing, provide both raw IDs and populated data
  // This allows the frontend to use section-specific updates with raw IDs
  const processedPages = await Promise.all(
    pages.map(async (page) => {
      if (page.type === ContentType.LANDING_PAGE && page.sections) {
        // Process sections to ensure categoryIds and productIds are available
        const processedSections = await Promise.all(
          page.sections.map(async (section: any) => {
            if (section.type === 'collection' || section.type === 'categories') {
              // Ensure categoryIds are available for collection sections
              if (!section.categoryIds && section.categories) {
                section.categoryIds = section.categories.map((cat: any) => cat.id || cat._id).filter(Boolean);
              }
              
              // Populate categories if categoryIds exist
              if (section.categoryIds && section.categoryIds.length > 0) {
                try {
                  const Category = await import('@models/category/category.model.js');
                  const categories = await Category.default.find({
                    _id: { $in: section.categoryIds }
                  }).select('_id name imageUrl').lean();
                  
                  section.categories = categories.map(cat => ({
                    id: cat._id.toString(),
                    name: cat.name,
                    imageUrl: cat.imageUrl || '',
                    link: `/categories/${cat._id}`
                  }));
                } catch (error) {
                  console.error('Error populating categories:', error);
                  section.categories = [];
                }
              }
              
              return section;
            }
            if (section.type === 'products') {
              // Ensure productIds are available for product sections
              if (!section.productIds && section.products) {
                section.productIds = section.products.map((prod: any) => prod.id || prod._id).filter(Boolean);
              }
              
              // Populate products if productIds exist
              if (section.productIds && section.productIds.length > 0) {
                try {
                  const Product = await import('@models/product/product.model.js');
                  const products = await Product.default.find({
                    _id: { $in: section.productIds }
                  }).select('_id title price images description').lean();
                  
                  section.products = products.map(prod => ({
                    id: prod._id.toString(),
                    title: prod.title,
                    price: prod.price?.toString() || '0',
                    image: prod.images?.[0] || '',
                    description: prod.description || '',
                    delivery: 'Standard delivery',
                    location: '',
                    seller: ''
                  }));
                } catch (error) {
                  console.error('Error populating products:', error);
                  section.products = [];
                }
              }
              
              return section;
            }
            return section;
          })
        );
        
        return { ...page, sections: processedSections };
      }
      return page;
    })
  );

  console.log('processedPages', processedPages);
  res.status(200).json({
    success: true,
    data: processedPages,
  });
  
})

/**
 * Get single CMS page by slug
 */
export const getPageBySlug = catchAsync(async (req: Request, res: Response) => {
  const userId = req.userId
  const { slug } = req.params
  const { populate } = req.query

  if (!userId) {
    throw ApiError.unauthorized('User not authenticated')
  }

  const page = await CmsContent.findOne({
    userId,
    slug,
    type: { $in: [ContentType.PAGE, ContentType.LANDING_PAGE] },
  }).lean()

  if (!page) {
    throw ApiError.notFound('Page not found')
  }

  // Only populate if explicitly requested
  const shouldPopulate = populate === 'true'
  
  let populatedPage = page
  if (shouldPopulate && page.type === ContentType.LANDING_PAGE && page.sections) {
    const populatedSections = await populateLandingPageSections(page.sections)
    populatedPage = { ...page, sections: populatedSections }
  }

  res.status(200).json({
    success: true,
    data: populatedPage,
  })
})

/**
 * Create or update CMS page
 */
export const upsertPage = catchAsync(async (req: Request, res: Response) => {
  const userId = req.userId
  const user = req.user as IUser
  const { id } = req.params

  if (!userId || !user) {
    throw ApiError.unauthorized('User not authenticated')
  }

  // Only sellers can manage CMS pages
  if (!['seller', 'admin'].includes(user.role)) {
    throw ApiError.forbidden('Only sellers can manage CMS pages')
  }

  console.log('Request body:', JSON.stringify(req.body, null, 2))
  
  const validatedData = id
    ? updateCmsContentSchema.parse(req.body)
    : createCmsContentSchema.parse(req.body)
  
  console.log('Validated data:', JSON.stringify(validatedData, null, 2))
  console.log('Sections to save:', JSON.stringify(validatedData.sections, null, 2))

  // For pages, ensure type is either PAGE or LANDING_PAGE
  if (
    validatedData.type &&
    ![ContentType.PAGE, ContentType.LANDING_PAGE].includes(validatedData.type)
  ) {
    throw ApiError.badRequest('Invalid page type')
  }

  let page: ICmsContent

  if (id) {
    // First, get the existing page to check its type
    const existingPage = await CmsContent.findOne({ _id: id, userId })
    
    if (!existingPage) {
      throw ApiError.notFound('Page not found')
    }
    
    // Validate content only if it's not a landing page
    if (existingPage.type !== ContentType.LANDING_PAGE && 
        (!validatedData.content || validatedData.content.trim().length === 0)) {
      throw ApiError.badRequest('Content is required for non-landing pages')
    }
    
    // Update existing page
    const updateData = {
      ...validatedData,
      lastUpdated: new Date(),
    }
    console.log('Update data being sent to DB:', JSON.stringify(updateData, null, 2))
    
    page = await CmsContent.findOneAndUpdate(
      { _id: id, userId },
      updateData,
      { new: true, runValidators: true }
    )

    console.log('Page after update:', JSON.stringify(page.toObject(), null, 2))
    logger.info('CMS page updated', { userId, pageId: id })

    // Don't populate the sections for the response - return raw data
    res.status(200).json({
      success: true,
      message: 'Page updated successfully',
      data: page,
    })
  } else {
    // Create new page
    page = await CmsContent.create({
      userId,
      ...validatedData,
      type: validatedData.title.toLowerCase().includes('terms') ? ContentType.TERMS_CONDITIONS : validatedData.title.toLowerCase().includes('privacy') ? ContentType.PRIVACY_POLICY : validatedData.title.toLowerCase().includes('about') ? ContentType.ABOUT_US : validatedData.type,
    })


    res.status(201).json({
      success: true,
      message: 'Page created successfully',
      data: page,
    })
  }
})

/**
 * Update CMS content
 */
export const updateCmsContent = catchAsync(async (req: Request, res: Response) => {
  const userId = req.userId
  const user = req.user as IUser
  const { type } = req.params

  if (!userId || !user) {
    throw ApiError.unauthorized('User not authenticated')
  }

  // Only sellers can update CMS content
  if (!['seller', 'admin'].includes(user.role)) {
    throw ApiError.forbidden('Only sellers can manage CMS content')
  }

  // Validate content type
  if (!Object.values(ContentType).includes(type as ContentType)) {
    throw ApiError.badRequest('Invalid content type')
  }

  const validatedData = updateCmsContentSchema.parse(req.body)

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
  )

  if (!content) {
    throw ApiError.notFound('Content not found')
  }

  logger.info('CMS content updated', { userId, type })

  res.status(200).json({
    success: true,
    message: 'Content updated successfully',
    data: content,
  })
})

/**
 * Delete CMS content
 */
export const deleteCmsContent = catchAsync(async (req: Request, res: Response) => {
  const userId = req.userId
  const user = req.user as IUser
  const { type } = req.params

  if (!userId || !user) {
    throw ApiError.unauthorized('User not authenticated')
  }

  // Only sellers can delete CMS content
  if (!['seller', 'admin'].includes(user.role)) {
    throw ApiError.forbidden('Only sellers can manage CMS content')
  }

  // Validate content type
  if (!Object.values(ContentType).includes(type as ContentType)) {
    throw ApiError.badRequest('Invalid content type')
  }

  const content = await CmsContent.findOneAndDelete({
    userId,
    type: type as ContentType,
  })

  if (!content) {
    throw ApiError.notFound('Content not found')
  }

  logger.info('CMS content deleted', { userId, type })

  res.status(200).json({
    success: true,
    message: 'Content deleted successfully',
  })
})

/**
 * Get public CMS content for a seller (for buyers)
 */
export const getPublicCmsContent = catchAsync(async (req: Request, res: Response) => {
  const { sellerId, type } = req.params

  // Validate content type
  if (!Object.values(ContentType).includes(type as ContentType)) {
    throw ApiError.badRequest('Invalid content type')
  }

  const content = await CmsContent.findOne({
    userId: sellerId,
    type: type as ContentType,
    isActive: true,
  }).select('title content lastUpdated type')

  if (!content) {
    // Return default content if seller hasn't set up their content
    const defaultContent = getDefaultContent(type as ContentType)
    return res.status(200).json({
      success: true,
      data: defaultContent,
    })
  }

  res.status(200).json({
    success: true,
    data: content,
  })
})

/**
 * Get all public CMS content for a seller (for buyers)
 */
export const getAllPublicCmsContent = catchAsync(async (req: Request, res: Response) => {
  const { sellerId } = req.params

  const contents = await CmsContent.find({
    userId: sellerId,
    isActive: true,
  }).select('title content lastUpdated type')

  // Add default content for missing types
  const contentTypes = contents.map((c) => c.type)
  const allTypes = Object.values(ContentType)
  const missingTypes = allTypes.filter((type) => !contentTypes.includes(type))

  const allContents = [...contents, ...missingTypes.map((type) => getDefaultContent(type))]

  res.status(200).json({
    success: true,
    data: allContents,
  })
})

// Helper function to get default content
function getDefaultContent(type: ContentType) {
  switch (type) {
    case ContentType.TERMS_CONDITIONS:
      return {
        type: ContentType.TERMS_CONDITIONS,
        title: 'Terms & Conditions',
        content: 'No terms and conditions have been set by this seller yet.',
        lastUpdated: new Date(),
      }
    case ContentType.PRIVACY_POLICY:
      return {
        type: ContentType.PRIVACY_POLICY,
        title: 'Privacy Policy',
        content: 'No privacy policy has been set by this seller yet.',
        lastUpdated: new Date(),
      }
    case ContentType.ABOUT_US:
      return {
        type: ContentType.ABOUT_US,
        title: 'About Us',
        content: 'No information about this seller has been provided yet.',
        lastUpdated: new Date(),
      }
    default:
      return {
        type,
        title: 'Content',
        content: 'No content available.',
        lastUpdated: new Date(),
      }
  }
}

/**
 * Get public landing page (for homepage)
 */
export const getPublicLandingPage = catchAsync(async (req: Request, res: Response) => {
  // Find the first active landing page (or specific one if needed)
  const landingPage = await CmsContent.findOne({
    type: ContentType.LANDING_PAGE,
    isActive: true,
  }).sort({ updatedAt: -1 }).lean()

  if (!landingPage) {
    return res.status(200).json({
      success: true,
      data: null,
      message: 'No landing page found',
    })
  }

  // Populate sections with actual product/category data
  let populatedPage = landingPage
  if (landingPage.sections) {
    const populatedSections = await populateLandingPageSections(landingPage.sections)
    populatedPage = { ...landingPage, sections: populatedSections }
  }

  res.status(200).json({
    success: true,
    data: populatedPage,
  })
})

/**
 * Update banner section of landing page
 */
export const updateBannerSection = catchAsync(async (req: Request, res: Response) => {
  const userId = req.userId
  const user = req.user as IUser
  const { pageId, sectionId } = req.params
  const sectionData = req.body

  console.log('🎯 Backend: updateBannerSection called', {
    userId,
    pageId,
    sectionId,
    sectionData,
    userEmail: user?.email
  });

  if (!userId || !user) {
    throw ApiError.unauthorized('User not authenticated')
  }

  // Find the page
  const page = await CmsContent.findOne({ _id: pageId, userId })
  if (!page) {
    console.error('❌ Backend: Page not found', { pageId, userId });
    throw ApiError.notFound('Page not found')
  }

  console.log('📄 Backend: Found page', {
    pageId: page._id,
    pageTitle: page.title,
    sectionsCount: page.sections?.length || 0
  });

  // Update the specific banner section
  if (page.sections) {
    const sectionIndex = page.sections.findIndex((s: any) => s.id === sectionId)
    console.log('🔍 Backend: Looking for section', {
      sectionId,
      sectionIndex,
      totalSections: page.sections.length,
      sectionIds: page.sections.map((s: any) => s.id)
    });

    if (sectionIndex !== -1) {
      const oldSection = page.sections[sectionIndex];
      console.log('📦 Backend: Found section to update', {
        sectionIndex,
        oldSection: {
          id: oldSection.id,
          type: oldSection.type,
          title: oldSection.title
        },
        newData: sectionData
      });

      // Update only the banner section, keeping type as 'hero'
      page.sections[sectionIndex] = {
        ...page.sections[sectionIndex],
        ...sectionData,
        id: sectionId,
        type: 'hero'
      }

      console.log('✅ Backend: Section updated', {
        sectionIndex,
        updatedSection: {
          id: page.sections[sectionIndex].id,
          type: page.sections[sectionIndex].type,
          title: page.sections[sectionIndex].title
        }
      });
    } else {
      console.error('❌ Backend: Section not found', { sectionId, availableSections: page.sections.map((s: any) => s.id) });
    }
  }

  await page.save()
  console.log('💾 Backend: Page saved successfully');

  res.status(200).json({
    success: true,
    message: 'Banner section updated successfully',
    data: page,
  })
})

/**
 * Update collection section of landing page
 */
export const updateCollectionSection = catchAsync(async (req: Request, res: Response) => {
  const userId = req.userId
  const user = req.user as IUser
  const { pageId, sectionId } = req.params
  const sectionData = req.body

  console.log('📚 Backend: updateCollectionSection called', {
    userId,
    pageId,
    sectionId,
    sectionData,
    userEmail: user?.email,
    categoryIdsCount: sectionData.categoryIds?.length || 0
  });

  if (!userId || !user) {
    throw ApiError.unauthorized('User not authenticated')
  }

  // Find the page
  const page = await CmsContent.findOne({ _id: pageId, userId })
  if (!page) {
    console.error('❌ Backend: Page not found', { pageId, userId });
    throw ApiError.notFound('Page not found')
  }

  console.log('📄 Backend: Found page', {
    pageId: page._id,
    pageTitle: page.title,
    sectionsCount: page.sections?.length || 0
  });

  // Update the specific collection section
  if (page.sections) {
    const sectionIndex = page.sections.findIndex((s: any) => s.id === sectionId)
    console.log('🔍 Backend: Looking for collection section', {
      sectionId,
      sectionIndex,
      totalSections: page.sections.length,
      sectionIds: page.sections.map((s: any) => s.id)
    });

    if (sectionIndex !== -1) {
      const oldSection = page.sections[sectionIndex];
      console.log('📦 Backend: Found collection section to update', {
        sectionIndex,
        oldSection: {
          id: oldSection.id,
          type: oldSection.type,
          title: oldSection.title,
          categoryIds: oldSection.categoryIds
        },
        newData: sectionData
      });

      // Update only the collection section, preserving categoryIds
      page.sections[sectionIndex] = {
        ...page.sections[sectionIndex],
        ...sectionData,
        id: sectionId,
        type: 'categories',
        categoryIds: sectionData.categoryIds || []
      }

      console.log('✅ Backend: Collection section updated', {
        sectionIndex,
        updatedSection: {
          id: page.sections[sectionIndex].id,
          type: page.sections[sectionIndex].type,
          title: page.sections[sectionIndex].title,
          categoryIds: page.sections[sectionIndex].categoryIds
        }
      });
    } else {
      console.error('❌ Backend: Collection section not found', { sectionId, availableSections: page.sections.map((s: any) => s.id) });
    }
  }

  await page.save()
  console.log('💾 Backend: Page saved successfully');

  res.status(200).json({
    success: true,
    message: 'Collection section updated successfully',
    data: page,
  })
})

/**
 * Update product section of landing page
 */
export const updateProductSection = catchAsync(async (req: Request, res: Response) => {
  const userId = req.userId
  const user = req.user as IUser
  const { pageId, sectionId } = req.params
  const sectionData = req.body

  console.log('🛍️ Backend: updateProductSection called', {
    userId,
    pageId,
    sectionId,
    sectionData,
    userEmail: user?.email,
    productIdsCount: sectionData.productIds?.length || 0
  });

  if (!userId || !user) {
    throw ApiError.unauthorized('User not authenticated')
  }

  // Find the page
  const page = await CmsContent.findOne({ _id: pageId, userId })
  if (!page) {
    console.error('❌ Backend: Page not found', { pageId, userId });
    throw ApiError.notFound('Page not found')
  }

  console.log('📄 Backend: Found page', {
    pageId: page._id,
    pageTitle: page.title,
    sectionsCount: page.sections?.length || 0
  });

  // Update the specific product section
  if (page.sections) {
    const sectionIndex = page.sections.findIndex((s: any) => s.id === sectionId)
    console.log('🔍 Backend: Looking for product section', {
      sectionId,
      sectionIndex,
      totalSections: page.sections.length,
      sectionIds: page.sections.map((s: any) => s.id)
    });

    if (sectionIndex !== -1) {
      const oldSection = page.sections[sectionIndex];
      console.log('📦 Backend: Found product section to update', {
        sectionIndex,
        oldSection: {
          id: oldSection.id,
          type: oldSection.type,
          title: oldSection.title,
          productIds: oldSection.productIds
        },
        newData: sectionData
      });

      // Update only the product section, preserving productIds
      page.sections[sectionIndex] = {
        ...page.sections[sectionIndex],
        ...sectionData,
        id: sectionId,
        type: 'products',
        productIds: sectionData.productIds || []
      }

      console.log('✅ Backend: Product section updated', {
        sectionIndex,
        updatedSection: {
          id: page.sections[sectionIndex].id,
          type: page.sections[sectionIndex].type,
          title: page.sections[sectionIndex].title,
          productIds: page.sections[sectionIndex].productIds
        }
      });
    } else {
      console.error('❌ Backend: Product section not found', { sectionId, availableSections: page.sections.map((s: any) => s.id) });
    }
  }

  await page.save()
  console.log('💾 Backend: Page saved successfully');

  res.status(200).json({
    success: true,
    message: 'Product section updated successfully',
    data: page,
  })
})

export default {
  upsertCmsContent,
  getCmsContent,
  getAllCmsContent,
  updateCmsContent,
  deleteCmsContent,
  getPublicCmsContent,
  getAllPublicCmsContent,
  getAllPages,
  getPageBySlug,
  upsertPage,
  getPublicLandingPage,
  updateBannerSection,
  updateCollectionSection,
  updateProductSection,
}
