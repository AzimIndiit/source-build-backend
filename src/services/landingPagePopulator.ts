import mongoose from 'mongoose';
import Product from '../models/product/product.model.js';
import Category from '../models/category/category.model.js';
import { ILandingSection } from '../models/cms/cms.model.js';

/**
 * Validates if a string is a valid MongoDB ObjectId
 */
function isValidObjectId(id: string): boolean {
  try {
    return mongoose.Types.ObjectId.isValid(id) && 
           (new mongoose.Types.ObjectId(id)).toString() === id;
  } catch {
    return false;
  }
}

/**
 * Filters and validates MongoDB ObjectIds from an array of IDs
 */
function filterValidObjectIds(ids: string[]): string[] {
  return ids.filter(id => isValidObjectId(id));
}

/**
 * Populates landing page sections with actual product and category data
 * @param sections - Array of landing page sections
 * @returns Sections with populated data
 */
export async function populateLandingPageSections(sections: ILandingSection[]): Promise<ILandingSection[]> {
  if (!sections || sections.length === 0) {
    return sections;
  }

  const populatedSections = await Promise.all(
    sections.map(async (section) => {
      try {
        // Populate products section
        if (section.type === 'products') {
          let productIds: string[] = [];
          
          // Check for productIds field (new format)
          if (section.productIds && section.productIds.length > 0) {
            productIds = section.productIds;
          } 
          // Check for products array with objects containing id (legacy format)
          else if (section.products && Array.isArray(section.products) && section.products.length > 0) {
            productIds = section.products
              .map((p: any) => p.id || p._id)
              .filter(Boolean);
          }
          
          if (productIds.length > 0) {
            // Filter out invalid ObjectIds
            const validProductIds = filterValidObjectIds(productIds);
            
            if (validProductIds.length === 0) {
              return {
                ...section,
                items: [],
                products: [],
              } as ILandingSection;
            }

            const products = await Product.find({
              _id: { $in: validProductIds },
              status: "active",
            })
            .select('_id title price priceType readyByDays description images slug location')
            .populate('seller', 'displayName name')
            .lean();

            // Convert products to the expected format
            const items = products.map((product: any) => ({
              id: product._id.toString(),
              title: product.title || '',
              image: product.images?.[0] || '',
              price: product.price?.toString() || '',
              priceType: product.priceType || '',
              readyByDays: product.readyByDays?.toString() || '',
              description: product.description || '',
              location: product.location || '',
              seller: product.seller?.displayName || product.seller?.name || '',
              link: `/marketplace/product/${product.slug || product._id}`,
            }));

            return {
              ...section,
              items,
              // Also return products in the format expected by frontend
              products: items,
            } as ILandingSection;
          }
        }

        // Populate categories section
        if (section.type === 'categories') {
          let categoryIds: string[] = [];
          
          // Check for categoryIds field (new format)
          if (section.categoryIds && section.categoryIds.length > 0) {
            categoryIds = section.categoryIds;
          }
          // Check for categories array with objects containing id (legacy format)
          else if ((section as any).categories && Array.isArray((section as any).categories) && (section as any).categories.length > 0) {
            categoryIds = (section as any).categories
              .map((c: any) => c.id || c._id)
              .filter(Boolean);
          }
          
          if (categoryIds.length > 0) {
            // Filter out invalid ObjectIds
            const validCategoryIds = filterValidObjectIds(categoryIds);
            
            if (validCategoryIds.length === 0) {
              return {
                ...section,
                items: [],
                categories: [],
              } as ILandingSection;
            }

            const categories = await Category.find({
              _id: { $in: validCategoryIds },
              isActive: true,
            })
            .select('_id name image slug')
            .lean();

            // Convert categories to the expected format
            const items = categories.map((category: any) => ({
              id: category._id.toString(),
              title: category.name || '',
              name: category.name || '',
              image: category.image || '',
              imageUrl: category.image || '',
              link: `/marketplace?category=${category.slug || ''}`,
            }));

            return {
              ...section,
              items,
              // Also return categories in the format expected by frontend
              categories: items,
            } as ILandingSection;
          }
        }

        // Return other sections as-is
        return section;
      } catch (error) {
        console.error(`Error populating section ${section.id}:`, error);
        // Return section with empty items on error
        return {
          ...section,
          items: [],
          ...(section.type === 'products' && { products: [] }),
          ...(section.type === 'categories' && { categories: [] }),
        } as ILandingSection;
      }
    })
  );

  return populatedSections;
}