import { Types } from 'mongoose';
import ProductModal from '@models/product/product.model.js';
import { IProduct, ProductFilterDTO } from '@models/product/product.types.js';

export class ProductLocationService {
  /**
   * Find products near a specific location using MongoDB geospatial queries
   * @param latitude User's latitude
   * @param longitude User's longitude
   * @param maxDistance Maximum distance in kilometers (default: 10km)
   * @param filters Additional filters for products
   * @returns Products within the specified radius
   */
  static async findProductsNearLocation(
    latitude: number,
    longitude: number,
    maxDistance: number = 10,
    filters: Partial<ProductFilterDTO> = {}
  ): Promise<IProduct[]> {
    const query: any = {
      status: 'active',
      quantity: { $gt: 0 },
    };

    // Add location-based query using MongoDB's $geoNear
    query['locations.coordinates'] = {
      $geoWithin: {
        $centerSphere: [
          [longitude, latitude],
          maxDistance / 6378.1 // Convert km to radians (Earth's radius in km)
        ]
      }
    };

    // Add additional filters
    if (filters.category) query.category = filters.category;
    if (filters.subCategory) query.subCategory = filters.subCategory;
    if (filters.brand) query.brand = filters.brand;
    if (filters.minPrice || filters.maxPrice) {
      query.price = {};
      if (filters.minPrice) query.price.$gte = filters.minPrice;
      if (filters.maxPrice) query.price.$lte = filters.maxPrice;
    }
    if (filters.seller) query.seller = filters.seller;
    if (filters.featured !== undefined) query.featured = filters.featured;
    if (filters.tags && filters.tags.length > 0) {
      query.productTag = { $in: filters.tags };
    }

    // Text search if search query is provided
    if (filters.search) {
      query.$text = { $search: filters.search };
    }

    // Build sort options
    let sortOptions: any = {};
    if (filters.sort) {
      switch (filters.sort) {
        case 'price_asc':
          sortOptions = { price: 1 };
          break;
        case 'price_desc':
          sortOptions = { price: -1 };
          break;
        case 'newest':
          sortOptions = { createdAt: -1 };
          break;
        case 'popular':
          sortOptions = { views: -1 };
          break;
        case 'rating':
          sortOptions = { rating: -1 };
          break;
        default:
          sortOptions = { createdAt: -1 };
      }
    }

    // Pagination
    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const skip = (page - 1) * limit;

    return await ProductModal
      .find(query)
      .sort(sortOptions)
      .skip(skip)
      .limit(limit)
      .populate('seller', 'name email')
      .lean();
  }

  /**
   * Find products using aggregation pipeline for more complex location queries
   * Includes distance calculation from user's location
   */
  static async findProductsWithDistance(
    latitude: number,
    longitude: number,
    maxDistance: number = 10,
    filters: Partial<ProductFilterDTO> = {}
  ): Promise<any[]> {
    const pipeline: any[] = [];

    // Start with geoNear stage to calculate distances
    pipeline.push({
      $geoNear: {
        near: {
          type: 'Point',
          coordinates: [longitude, latitude]
        },
        distanceField: 'distance',
        maxDistance: maxDistance * 1000, // Convert km to meters
        spherical: true,
        query: {
          status: 'active',
          quantity: { $gt: 0 }
        },
        distanceMultiplier: 0.001 // Convert meters to km
      }
    });

    // Add match stage for additional filters
    const matchConditions: any = {};
    if (filters.category) matchConditions.category = filters.category;
    if (filters.subCategory) matchConditions.subCategory = filters.subCategory;
    if (filters.brand) matchConditions.brand = filters.brand;
    if (filters.minPrice || filters.maxPrice) {
      matchConditions.price = {};
      if (filters.minPrice) matchConditions.price.$gte = filters.minPrice;
      if (filters.maxPrice) matchConditions.price.$lte = filters.maxPrice;
    }
    if (filters.seller) matchConditions.seller = new Types.ObjectId(filters.seller.toString());
    if (filters.featured !== undefined) matchConditions.featured = filters.featured;

    if (Object.keys(matchConditions).length > 0) {
      pipeline.push({ $match: matchConditions });
    }

    // Add location details to each product
    pipeline.push({
      $addFields: {
        nearestLocation: {
          $filter: {
            input: '$locations',
            as: 'loc',
            cond: {
              $lte: [
                {
                  $sqrt: {
                    $add: [
                      { $pow: [{ $subtract: [{ $arrayElemAt: ['$$loc.coordinates.coordinates', 0] }, longitude] }, 2] },
                      { $pow: [{ $subtract: [{ $arrayElemAt: ['$$loc.coordinates.coordinates', 1] }, latitude] }, 2] }
                    ]
                  }
                },
                maxDistance / 111.12 // Rough conversion of km to degrees
              ]
            }
          }
        }
      }
    });

    // Sort by distance by default
    if (!filters.sort || filters.sort === 'distance') {
      pipeline.push({ $sort: { distance: 1 } });
    } else {
      const sortField = this.getSortField(filters.sort);
      pipeline.push({ $sort: sortField });
    }

    // Pagination
    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const skip = (page - 1) * limit;

    pipeline.push({ $skip: skip });
    pipeline.push({ $limit: limit });

    // Populate seller information
    pipeline.push({
      $lookup: {
        from: 'users',
        localField: 'seller',
        foreignField: '_id',
        as: 'seller'
      }
    });
    pipeline.push({
      $unwind: {
        path: '$seller',
        preserveNullAndEmptyArrays: true
      }
    });

    // Project only needed seller fields
    pipeline.push({
      $project: {
        'seller.password': 0,
        'seller.refreshToken': 0,
        'seller.__v': 0
      }
    });

    return await ProductModal.aggregate(pipeline);
  }

  /**
   * Find products by city, state, or country
   */
  static async findProductsByLocation(
    filters: Partial<ProductFilterDTO>
  ): Promise<IProduct[]> {
    const query: any = {
      status: 'active',
      quantity: { $gt: 0 }
    };

    // Location-based text filters
    const locationFilters: any = {};
    if (filters.city) locationFilters['locations.city'] = new RegExp(filters.city, 'i');
    if (filters.state) locationFilters['locations.state'] = new RegExp(filters.state, 'i');
    if (filters.country) locationFilters['locations.country'] = new RegExp(filters.country, 'i');

    if (Object.keys(locationFilters).length > 0) {
      query.$or = Object.entries(locationFilters).map(([key, value]) => ({ [key]: value }));
    }

    // Add other filters
    if (filters.category) query.category = filters.category;
    if (filters.subCategory) query.subCategory = filters.subCategory;
    if (filters.brand) query.brand = filters.brand;
    if (filters.minPrice || filters.maxPrice) {
      query.price = {};
      if (filters.minPrice) query.price.$gte = filters.minPrice;
      if (filters.maxPrice) query.price.$lte = filters.maxPrice;
    }

    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const skip = (page - 1) * limit;

    return await ProductModal
      .find(query)
      .skip(skip)
      .limit(limit)
      .populate('seller', 'name email')
      .lean();
  }

  /**
   * Check if a product is available at user's location
   */
  static async isProductAvailableAtLocation(
    productId: string,
    latitude: number,
    longitude: number
  ): Promise<{ available: boolean; nearestLocation?: any; distance?: number }> {
    const product = await ProductModal.findById(productId);
    
    if (!product || product.status !== 'active' || product.quantity <= 0) {
      return { available: false };
    }

    // Check each location for availability
    for (const location of product.locationIds) {
      const distance = this.calculateDistance(
        latitude,
        longitude,
        location.coordinates.coordinates[1],
        location.coordinates.coordinates[0]
      );

      const availabilityRadius = location.availabilityRadius || 10;
      
      if (distance <= availabilityRadius) {
        return {
          available: true,
          nearestLocation: location,
          distance: Math.round(distance * 100) / 100
        };
      }
    }

    return { available: false };
  }

  /**
   * Calculate distance between two points using Haversine formula
   */
  private static calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number {
    const R = 6371; // Earth's radius in kilometers
    const dLat = this.toRad(lat2 - lat1);
    const dLon = this.toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(lat1)) * Math.cos(this.toRad(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private static toRad(value: number): number {
    return value * Math.PI / 180;
  }

  private static getSortField(sort: string): any {
    switch (sort) {
      case 'price_asc':
        return { price: 1 };
      case 'price_desc':
        return { price: -1 };
      case 'newest':
        return { createdAt: -1 };
      case 'popular':
        return { views: -1 };
      case 'rating':
        return { rating: -1 };
      default:
        return { distance: 1 };
    }
  }

  /**
   * Update product locations
   */
  static async updateProductLocations(
    productId: string,
    locations: any[]
  ): Promise<IProduct | null> {
    // Ensure at least one location is marked as default
    if (locations.length > 0 && !locations.some(loc => loc.isDefault)) {
      locations[0].isDefault = true;
    }

    return await ProductModal.findByIdAndUpdate(
      productId,
      { locations },
      { new: true, runValidators: true }
    );
  }
}