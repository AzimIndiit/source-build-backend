import { validate } from '@/middlewares/validation.middleware.js';
import { Request, Response } from 'express';
import { Types } from 'mongoose';
import catchAsync from '@utils/catchAsync.js';
import ApiResponse from '@utils/ApiResponse.js';
import ApiError from '@utils/ApiError.js';
import ProductModal from '@models/product/product.model.js';
import { CreateProductDTO, UpdateProductDTO, ProductStatus } from '@models/product/product.types.js';
import { getProductsSchema, getProductBySlugSchema, createProductSchema, createProductDraftSchema } from '@models/product/product.validators.js';

export const createProductDraft = [validate(createProductDraftSchema), catchAsync(async (req: Request, res: Response) => {
  const productData = req.body;
  const  productId = req.params.id;
  if(productId){
    const product = await ProductModal.findById(productId);
    if(!product){
      throw ApiError.notFound('Product not found');
    }
    Object.assign(product, productData);
    product.status=  ProductStatus.DRAFT;
    await product.save();
    return ApiResponse.success(res, product, 'Product draft updated successfully');
  }else {
  const product = await ProductModal.create({
    ...productData,
    seller: req.user?.id,
    status:ProductStatus.DRAFT,
  });

  await product.populate('seller', 'displayName email avatar');

  return ApiResponse.created(res, product, 'Product draft created successfully');}
})];

export const createProduct = [validate(createProductSchema), catchAsync(async (req: Request, res: Response) => {
  const productData: CreateProductDTO = req.body;
  
  const product = await ProductModal.create({
    ...productData,
    seller: req.user?.id,
    status:ProductStatus.ACTIVE,
  });

  await product.populate('seller', 'displayName email avatar');

  return ApiResponse.created(res, product, 'Product created successfully');
})];


export const getProducts = [validate(getProductsSchema, 'query'),catchAsync(async (req: Request, res: Response) => {
  const query = req.query;
  const user = req.user?.id || null;
  const page = parseInt(String(query['page'] || '1')) || 1;
  const limit = parseInt(String(query['limit'] || '10')) || 10;
  const skip = (page - 1) * limit;

  const filter: any = {};

   if(user){
    filter.seller = user;
   }

  // ✅ Category, brand, seller, etc. (still supported)
  if (query['category']) filter.category = query['category'];
  if (query['subCategory']) filter.subCategory = query['subCategory'];
  if (query['brand']) filter.brand = query['brand'];
  if (query['color']) filter.color = query['color'];
  if (query['seller']) filter.seller = query['seller'];
  if (query['status']) filter.status = query['status'];

  // ✅ Tags
  if (query['tags']) {
    const tags = Array.isArray(query['tags']) ? query['tags'] : [query['tags']];
    filter.productTag = { $in: tags };
  }

  // ✅ Search
  if (query['search']) {
    filter.$or = [
      { title: { $regex: query['search'], $options: 'i' } },
      { description: { $regex: query['search'], $options: 'i' } },
      { brand: { $regex: query['search'], $options: 'i' } },
    ];
  }

  // ✅ Price range (from pricing filter)
  if (query['pricing'] === 'high-to-low' || query['pricing'] === 'low-to-high') {
    // handled in sort
  } else if (query['pricing'] === 'custom' && query['priceRange']) {
    const [min, max] = String(query['priceRange']).split(',').map(Number);
    filter.price = {};
    if (!isNaN(min as number)) filter.price.$gte = min as number;
    if (!isNaN(max as number)) filter.price.$lte = max as number;
  }

  // ✅ Popularity filter mapping
  // Handle both 'popularity' and 'popularity[]' parameter names
  const popularityParam = query['popularity'] || query['popularity[]'];
  if (popularityParam) {
    const popularity = Array.isArray(popularityParam)
      ? popularityParam
      : [popularityParam];

    if (popularity.includes('featured')) filter.featured = true;
    // "best-selling", "most-viewed", "most-reviewed", "top-rated", "trending"
    // will be handled in sort
  }

  // ✅ Availability filter
  // Handle both 'availability' and 'availability[]' parameter names
  const availabilityParam = query['availability'] || query['availability[]'];
  if (availabilityParam) {
    const availability = Array.isArray(availabilityParam)
      ? availabilityParam
      : [availabilityParam];

    if (availability.includes('delivery')) filter['marketplaceOptions.delivery'] = true;
    if (availability.includes('shipping')) filter['marketplaceOptions.shipping'] = true;
    if (availability.includes('pickup')) filter['marketplaceOptions.pickup'] = true;
  }

  // ✅ Ready time
  // Handle both 'readyTime' and 'readyTime[]' parameter names
  const readyTimeParam = query['readyTime'] || query['readyTime[]'];
  if (readyTimeParam) {
    const readyTime = Array.isArray(readyTimeParam)
      ? readyTimeParam
      : [readyTimeParam];

    if (readyTime.includes('next-day')) {
      filter.readyBy = { $lte: new Date(Date.now() + 24 * 60 * 60 * 1000) };
    }
    if (readyTime.includes('this-week')) {
      filter.readyBy = { $lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) };
    }
  }

  // ✅ Location filter
  if (query['location']) {
    if (query['location'] !== 'all' && query['location'] !== 'All Locations') {
      filter.locationIds = query['location'];
    }
  }

  // ✅ Sorting
  let sortOptions: any = { createdAt: -1 }; // default

  // --- Popularity Sorting ---
  // Handle both 'popularity' and 'popularity[]' parameter names
  if (popularityParam) {
    const pop = Array.isArray(popularityParam)
      ? popularityParam
      : [popularityParam];

    if (pop.includes('best-selling')) sortOptions = { salesCount: -1 };
    if (pop.includes('most-viewed')) sortOptions = { viewsCount: -1 };
    if (pop.includes('most-reviewed')) sortOptions = { reviewsCount: -1 };
    if (pop.includes('top-rated')) sortOptions = { averageRating: -1 };
    if (pop.includes('trending')) sortOptions = { trendingScore: -1 }; // custom metric
  }

  // --- Newest Sorting ---
  // Handle both 'newest' and 'newest[]' parameter names
  const newestParam = query['newest'] || query['newest[]'];
  if (newestParam) {
    const newest = Array.isArray(newestParam)
      ? newestParam
      : [newestParam];

    if (newest.includes('recently-updated')) sortOptions = { updatedAt: -1 };
    if (newest.includes('featured-new')) {
      filter.featured = true;
      sortOptions = { createdAt: -1 };
    }
    if (newest.includes('sort-by-date')) sortOptions = { createdAt: -1 };
    if (newest.includes('new-arrivals')) sortOptions = { createdAt: -1 };
  }

  // --- Sorting A-Z ---
  if (query['sorting']) {
    if (query['sorting'] === 'ascending') sortOptions = { title: 1 };
    if (query['sorting'] === 'descending') sortOptions = { title: -1 };
  }

  // --- Pricing Sorting ---
  if (query['pricing'] === 'high-to-low') sortOptions = { price: -1 };
  if (query['pricing'] === 'low-to-high') sortOptions = { price: 1 };

  // ✅ Fetch products and available locations
  const [products, total] = await Promise.all([
    ProductModal.find(filter)
      .populate('seller', 'displayName email avatar')
      .populate('locationIds')
      .sort(sortOptions)
      .skip(skip)
      .limit(limit)
      .lean(),
    ProductModal.countDocuments(filter),
  ]);

  // Get location IDs from the filtered products
  const locationIds = [...new Set(products.flatMap(product => 
    product.locationIds?.map(loc => loc._id?.toString()) || []
  ))].filter(Boolean);

  // Populate the location details based on user's available products
  const Address = (await import('../../models/address/address.model.js')).default;
  const availableLocations = await Address.find({ _id: { $in: locationIds } })
    .select('city state country displayName')
    .lean();

  const totalPages = Math.ceil(total / limit);

  return ApiResponse.successWithPagination(
    res,
    { 
      products, 
      availableLocations 
    },
    {
      page,
      limit,
      total,
      pages: totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    },
    'Products retrieved successfully'
  );
})];


export const getProductById = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;

  if (!Types.ObjectId.isValid(id as string)) {
    throw ApiError.badRequest('Invalid product ID');
  }

  const product = await ProductModal.findById(id)
    .populate('seller', 'displayName email avatar');

  if (!product) {
    throw ApiError.notFound('Product not found');
  }

  return ApiResponse.success(
    res,
    product,
    'Product retrieved successfully'
  );
});

export const getProductBySlug = [validate(getProductBySlugSchema, 'params'), catchAsync(async (req: Request, res: Response) => {
  const  slug: string  = req.params['slug'] as string;

  if (!slug) {
    throw ApiError.badRequest('Invalid product slug');
  }

  const product = await ProductModal.findOne({ slug })
    .populate('seller', 'displayName email avatar')
    .populate('locationIds');

  if (!product) {
    throw ApiError.notFound('Product not found');
  }

  await product.incrementView();

  return ApiResponse.success(
    res,
    product,
    'Product retrieved successfully'
  );
})];

export const updateProduct = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const updateData: UpdateProductDTO = req.body;

  if (!Types.ObjectId.isValid(id as string)) {
    throw ApiError.badRequest('Invalid product ID');
  }

  const product = await ProductModal.findById(id);

  if (!product) {
    throw ApiError.notFound('Product not found');
  }

  if (product.seller.toString() !== req.user?.id) {
    throw ApiError.forbidden('You are not authorized to update this product');
  }

  Object.assign(product, updateData);
  product.status=ProductStatus.ACTIVE;
  await product.save();

  await product.populate('seller', 'displayName email avatar');

  return ApiResponse.success(
    res,
    product,
    'Product updated successfully'
  );
});

export const deleteProduct = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;

  if (!Types.ObjectId.isValid(id as string)) {
    throw ApiError.badRequest('Invalid product ID');
  }

  const product = await ProductModal.findById(id);

  if (!product) {
    throw ApiError.notFound('Product not found');
  }

  if (product.seller.toString() !== req.user?.id && req.user?.role !== 'admin') {
    throw ApiError.forbidden('You are not authorized to delete this product');
  }

  await product.deleteOne();

  return ApiResponse.success(
    res,
    null,
    'Product deleted successfully'
  );
});

export const toggleProductStatus = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { status } = req.body;

  if (!Types.ObjectId.isValid(id as string)) {
    throw ApiError.badRequest('Invalid product ID');
  }

  if (!status || !['active', 'inactive'].includes(status)) {
    throw ApiError.badRequest('Invalid status. Must be either "active" or "inactive"');
  }

  const product = await ProductModal.findById(id);

  if (!product) {
    throw ApiError.notFound('Product not found');
  }

  if (product.seller.toString() !== req.user?.id && req.user?.role !== 'admin') {
    throw ApiError.forbidden('You are not authorized to update this product status');
  }

  product.status = status === 'active' ? ProductStatus.ACTIVE : ProductStatus.INACTIVE;
  await product.save();

  await product.populate('seller', 'displayName email avatar');

  return ApiResponse.success(
    res,
    product,
    'Product status updated successfully'
  );
});



