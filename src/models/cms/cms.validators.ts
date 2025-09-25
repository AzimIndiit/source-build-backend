import { z } from 'zod';
import { ContentType } from './cms.model.js';

// Transform frontend section types to backend types
const transformSectionType = (type: string) => {
  const typeMap: { [key: string]: string } = {
    'banner': 'hero',
    'collection': 'categories',
    'products': 'products',
    'deals': 'deals',
    'features': 'features'
  };
  return typeMap[type] || type;
};

// Transform frontend section structure to backend structure
const transformSection = (section: any) => {
  console.log('Transforming section:', JSON.stringify(section, null, 2))
  
  // Transform banner section
  if (section.type === 'banner' || section.type === 'hero') {
    // Check if items are already present (from frontend sending items directly)
    let items = [];
    if (section.items && Array.isArray(section.items)) {
      // Items already present, use them directly
      items = section.items.map((item: any) => ({
        title: item.title || '',
        link: item.link || '',
        description: item.description || ''
      }));
    } else if (section.buttons && Array.isArray(section.buttons)) {
      // Old format with buttons, transform them to items
      items = section.buttons.map((btn: any) => ({
        title: btn.title || '',
        link: btn.link || '',
        description: btn.description || ''
      }));
    }

    const transformed = {
      id: section.id,
      type: 'hero',
      title: section.title || '',
      subtitle: section.subtitle || '',
      backgroundImage: section.imageUrl || section.backgroundImage || '',
      items: items,
      order: section.order || 0
    };
    console.log('Transformed banner to hero:', JSON.stringify(transformed, null, 2))
    // Return only the transformed fields, not the original ones
    return transformed;
  }
  
  // Transform collection section
  if (section.type === 'collection' || section.type === 'categories') {
    // Handle both cases: categoryIds directly or categories array
    let categoryIds: string[] = [];
    
    // First check if categoryIds already exists (for updates)
    if (section.categoryIds && Array.isArray(section.categoryIds)) {
      categoryIds = section.categoryIds.filter(Boolean);
    }
    // Otherwise extract from categories array (for create)
    else if (section.categories && Array.isArray(section.categories)) {
      categoryIds = section.categories.map((cat: any) => cat.id).filter(Boolean);
    }
    
    console.log('Processing categories section:', {
      title: section.title,
      inputCategoryIds: section.categoryIds,
      inputCategories: section.categories,
      resultCategoryIds: categoryIds
    });
    
    return {
      id: section.id,
      type: 'categories',
      title: section.title || '',
      subtitle: section.subtitle || '',
      backgroundImage: section.backgroundImage || '',
      categoryIds: categoryIds, // Store only IDs
      items: [], // Keep empty - will be populated on fetch
      order: section.order || 0
    };
  }
  
  // Transform products section
  if (section.type === 'products') {
    // Handle both cases: productIds directly or products array
    let productIds: string[] = [];
    
    // First check if productIds already exists (for updates)
    if (section.productIds && Array.isArray(section.productIds)) {
      productIds = section.productIds.filter(Boolean);
    }
    // Otherwise extract from products array (for create)
    else if (section.products && Array.isArray(section.products)) {
      productIds = section.products.map((prod: any) => prod.id).filter(Boolean);
    }
    
    console.log('Processing products section:', {
      title: section.title,
      inputProductIds: section.productIds,
      inputProducts: section.products,
      resultProductIds: productIds
    });
    
    return {
      id: section.id,
      type: 'products',
      title: section.title || '',
      subtitle: section.subtitle || '',
      backgroundImage: section.backgroundImage || '',
      productIds: productIds, // Store only IDs
      items: [], // Keep empty - will be populated on fetch
      order: section.order || 0
    };
  }
  
  // Default: return as is (for already correct format)
  return {
    ...section,
    type: transformSectionType(section.type),
    items: section.items || [],
    order: section.order || 0
  };
};

const landingSectionSchema = z.object({
  id: z.string().optional(),
  type: z.union([
    z.enum(['hero', 'deals', 'products', 'categories', 'features']),
    z.enum(['banner', 'collection']) // Accept frontend types
  ]),
  title: z.string().trim().max(200).optional(),
  subtitle: z.string().trim().max(500).optional(),
  backgroundImage: z.string().trim().optional(),
  imageUrl: z.string().trim().optional(), // Accept frontend field
  buttons: z.array(z.any()).optional(), // Accept frontend buttons
  categories: z.array(z.any()).optional(), // Accept frontend categories
  products: z.array(z.any()).optional(), // Accept frontend products
  productIds: z.array(z.string()).optional(), // Accept product IDs directly
  categoryIds: z.array(z.string()).optional(), // Accept category IDs directly
  items: z.array(
    z.object({
      title: z.string().trim().max(200),
      image: z.string().trim().optional(),
      price: z.string().trim().optional(),
      link: z.string().trim().optional(),
      description: z.string().trim().max(500).optional(),
    })
  ).optional(),
  order: z.number().min(0).default(0),
}).transform(transformSection);

export const createCmsContentSchema = z.object({
  type: z.enum([
    ContentType.TERMS_CONDITIONS,
    ContentType.PRIVACY_POLICY,
    ContentType.ABOUT_US,
    ContentType.PAGE,
    ContentType.LANDING_PAGE,
  ]),
  title: z
    .string()
    .trim()
    .min(1, 'Title is required')
    .max(200, 'Title must not exceed 200 characters'),
  slug: z
    .string()
    .trim()
    .transform(val => val?.toLowerCase())
    .pipe(z.string().max(200))
    .optional(),
  content: z
    .string()
    .trim()
    .max(50000, 'Content must not exceed 50000 characters')
    .optional()
    .default(''),
  sections: z.array(landingSectionSchema).optional(),
  isActive: z.boolean().optional().default(true),
}).refine(
  (data) => {
    // For landing pages, content is optional
    if (data.type === ContentType.LANDING_PAGE) {
      return true;
    }
    // For other types, content is required
    return data.content && data.content.length > 0;
  },
  {
    message: 'Content is required for non-landing pages',
    path: ['content'],
  }
);

export const updateCmsContentSchema = z.object({
  type: z.enum([
    ContentType.TERMS_CONDITIONS,
    ContentType.PRIVACY_POLICY,
    ContentType.ABOUT_US,
    ContentType.PAGE,
    ContentType.LANDING_PAGE,
  ]).optional(),
  title: z
    .string()
    .trim()
    .min(1, 'Title is required')
    .max(200, 'Title must not exceed 200 characters')
    .optional(),
  slug: z
    .string()
    .trim()
    .transform(val => val?.toLowerCase())
    .pipe(z.string().max(200))
    .optional(),
  content: z
    .string()
    .trim()
    .max(50000, 'Content must not exceed 50000 characters')
    .optional()
    .default(''),
  sections: z.array(landingSectionSchema).optional(),
  isActive: z.boolean().optional(),
});

export type CreateCmsContentDto = z.infer<typeof createCmsContentSchema>;
export type UpdateCmsContentDto = z.infer<typeof updateCmsContentSchema>;