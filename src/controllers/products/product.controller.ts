import { validate } from '@/middlewares/validation.middleware.js'
import { Request, Response } from 'express'
import { Types } from 'mongoose'
import catchAsync from '@utils/catchAsync.js'
import ApiResponse from '@utils/ApiResponse.js'
import ApiError from '@utils/ApiError.js'
import ProductModal from '@models/product/product.model.js'
import { CreateProductDTO, UpdateProductDTO, ProductStatus } from '@models/product/product.types.js'
import {
  getProductsSchema,
  getProductBySlugSchema,
  createProductSchema,
  createProductDraftSchema,
} from '@models/product/product.validators.js'
import { Category } from '@models/category/index.js'
import { Subcategory } from '@models/subcategory/index.js'

export const createProductDraft = [
  validate(createProductDraftSchema),
  catchAsync(async (req: Request, res: Response) => {
    const productData = req.body
    const productId = req.params.id
    console.log('productData', productData)
    if (productId) {
      const product = await ProductModal.findById(productId)
      if (!product) {
        throw ApiError.notFound('Product not found')
      }
      
      // Handle variants separately to ensure proper replacement
      const { variants, ...otherProductData } = productData
      
      console.log('DRAFT UPDATE - Incoming variants:', variants)
      console.log('DRAFT UPDATE - Current product variants:', product.variants)
      
      // Update all fields except variants
      Object.assign(product, otherProductData)
      console.log('variants', variants)
      // Replace variants array completely if provided (including empty array to remove all variants)
      if (variants !== undefined) {
        console.log('DRAFT UPDATE - Replacing variants with:', variants)
        product.variants = variants
      } else {
        // If variants is not provided, remove all existing variants
        console.log('DRAFT UPDATE - Variants not provided, removing all existing variants')
        product.variants = []
      }
      
      product.status = ProductStatus.DRAFT
      await product.save()
      
      console.log('DRAFT UPDATE - After save, variants:', product.variants)
      return ApiResponse.success(res, product, 'Product draft updated successfully')
    } else {
      const product = await ProductModal.create({
        ...productData,
        seller: req.user?.id,
        status: ProductStatus.DRAFT,
      })

      await product.populate('seller', 'displayName email avatar profile')

      return ApiResponse.created(res, product, 'Product draft created successfully')
    }
  }),
]

export const createProduct = [
  validate(createProductSchema),
  catchAsync(async (req: Request, res: Response) => {
    const productData: CreateProductDTO = req.body

    const product = await ProductModal.create({
      ...productData,
      seller: req.user?.id,
      status: ProductStatus.ACTIVE,
    })

    await product
      .populate('seller', 'displayName email avatar profile')


    return ApiResponse.created(res, product, 'Product created successfully')
  }),
]

export const getProducts = [
  validate(getProductsSchema, 'query'),
  catchAsync(async (req: Request, res: Response) => {
    const query = req.query
    const user = req.user?.id || null
    const userRole = req?.user?.role || null
    const page = parseInt(String(query['page'] || '1')) || 1
    const limit = parseInt(String(query['limit'] || '10')) || 10
    const skip = (page - 1) * limit

    let filter: any = {
      status: ProductStatus.ACTIVE,
    }

    if (user && userRole !== 'buyer') {
      filter.seller = user
      delete filter.status
    }

    // Handle wishlist filter
    if (query['isInWishlist'] && user) {
      const Wishlist = (await import('../../models/wishlist/wishlist.model.js')).default
      const wishlist = await Wishlist.findOne({ user })
      const isInWishlistValue = String(query['isInWishlist'])

      if (isInWishlistValue === 'true') {
        // Show only products in wishlist
        if (wishlist && wishlist.items.length > 0) {
          const wishlistProductIds = wishlist.items.map((item: any) => item.product)
          filter._id = { $in: wishlistProductIds }
        } else {
          // User has no wishlist items, return empty results
          filter._id = { $in: [] }
        }
      } else if (isInWishlistValue === 'false') {
        // Show only products NOT in wishlist
        if (wishlist && wishlist.items.length > 0) {
          const wishlistProductIds = wishlist.items.map((item: any) => item.product)
          filter._id = { $nin: wishlistProductIds }
        }
        // If no wishlist, all products are "not in wishlist", so no filter needed
      }
    }

    // ✅ Category filtering - handle slug or ID
    if (query['category']) {
      // Check if it's a slug (contains letters) or an ID (valid ObjectId)
      const categoryValue = String(query['category'])
      if (Types.ObjectId.isValid(categoryValue)) {
        // It's an ID, use directly
        filter.category = categoryValue
      } else {
        // It's a slug, find the category by slug
        const category = await Category.findOne({ slug: categoryValue })
        if (category) {
          filter.category = category._id
        }
      }
    }
    
    // ✅ SubCategory filtering - handle slug or ID
    if (query['subCategory']) {
      const subCategoryValue = String(query['subCategory'])
      if (Types.ObjectId.isValid(subCategoryValue)) {
        // It's an ID, use directly
        filter.subCategory = subCategoryValue
      } else {
        // It's a slug, find the subcategory by slug
        const subcategory = await Subcategory.findOne({ slug: subCategoryValue })
        if (subcategory) {
          filter.subCategory = subcategory._id
        }
      }
    }
    if (query['brand']) filter.brand = query['brand']
    if (query['color']) filter.color = query['color']
    if (query['seller']) filter.seller = query['seller']
    if (query['status']) filter.status = query['status']

    // ✅ Tags
    if (query['tags']) {
      const tags = Array.isArray(query['tags']) ? query['tags'] : [query['tags']]
      filter.productTag = { $in: tags }
    }

    // ✅ Search
    if (query['search']) {
      filter.$or = [
        { title: { $regex: query['search'], $options: 'i' } },
        { description: { $regex: query['search'], $options: 'i' } },
        { brand: { $regex: query['search'], $options: 'i' } },
      ]
    }

    // ✅ Price range (from pricing filter)
    if (query['pricing'] === 'high-to-low' || query['pricing'] === 'low-to-high') {
      // handled in sort
    } else if (query['pricing'] === 'custom' && query['priceRange']) {
      const [min, max] = String(query['priceRange']).split(',').map(Number)
      filter.price = {}
      if (!isNaN(min as number)) filter.price.$gte = min as number
      if (!isNaN(max as number)) filter.price.$lte = max as number
    }

    // ✅ Popularity filter mapping
    // Handle both 'popularity' and 'popularity[]' parameter names
    const popularityParam = query['popularity'] || query['popularity[]']
    if (popularityParam) {
      const popularity = Array.isArray(popularityParam) ? popularityParam : [popularityParam]

      if (popularity.includes('featured')) filter.featured = true
      // "best-selling", "most-viewed", "most-reviewed", "top-rated", "trending"
      // will be handled in sort
    }

    // ✅ Availability filter
    // Handle both 'availability' and 'availability[]' parameter names
    const availabilityParam = query['availability'] || query['availability[]']
    if (availabilityParam) {
      const availability = Array.isArray(availabilityParam)
        ? availabilityParam
        : [availabilityParam]

      if (availability.includes('delivery')) filter['marketplaceOptions.delivery'] = true
      if (availability.includes('shipping')) filter['marketplaceOptions.shipping'] = true
      if (availability.includes('pickup')) filter['marketplaceOptions.pickup'] = true
    }

    // ✅ Ready time
    // Handle both 'readyTime' and 'readyTime[]' parameter names
    const readyTimeParam = query['readyTime'] || query['readyTime[]']
    if (readyTimeParam) {
      const readyTime = Array.isArray(readyTimeParam) ? readyTimeParam : [readyTimeParam]

      if (readyTime.includes('next-day')) {
        filter.readyByDays = 2
      }
      if (readyTime.includes('this-week')) {
        filter.readyByDays = 7
      }
    }

    // ✅ Location filter
    if (query['location']) {
      if (query['location'] !== 'all' && query['location'] !== 'All Locations') {
        filter.locationIds = query['location']
      }
    }

    // ✅ Sorting
    let sortOptions: any = { createdAt: -1 } // default

    // --- Popularity Sorting ---
    // Handle both 'popularity' and 'popularity[]' parameter names
    if (popularityParam) {
      const pop = Array.isArray(popularityParam) ? popularityParam : [popularityParam]

      if (pop.includes('best-selling')) sortOptions = { salesCount: -1 }
      if (pop.includes('most-viewed')) sortOptions = { viewsCount: -1 }
      if (pop.includes('most-reviewed')) sortOptions = { reviewsCount: -1 }
      if (pop.includes('top-rated')) sortOptions = { averageRating: -1 }
      if (pop.includes('trending')) sortOptions = { trendingScore: -1 } // custom metric
    }

    // --- Newest Sorting ---
    // Handle both 'newest' and 'newest[]' parameter names
    const newestParam = query['newest'] || query['newest[]']
    if (newestParam) {
      const newest = Array.isArray(newestParam) ? newestParam : [newestParam]

      if (newest.includes('recently-updated')) sortOptions = { updatedAt: -1 }
      if (newest.includes('featured-new')) {
        filter.featured = true
        sortOptions = { createdAt: -1 }
      }
      if (newest.includes('sort-by-date')) sortOptions = { createdAt: -1 }
      if (newest.includes('new-arrivals')) sortOptions = { createdAt: -1 }
    }

    // --- Sorting A-Z ---
    if (query['sorting']) {
      if (query['sorting'] === 'ascending') sortOptions = { title: 1 }
      if (query['sorting'] === 'descending') sortOptions = { title: -1 }
    }

    // --- Pricing Sorting ---
    if (query['pricing'] === 'high-to-low') sortOptions = { price: -1 }
    if (query['pricing'] === 'low-to-high') sortOptions = { price: 1 }
    console.log('filter', filter, userRole)
    // ✅ Fetch products and available locations
    const [products, total] = await Promise.all([
      ProductModal.find(filter)
        .populate('seller', 'displayName email avatar profile')
        .populate('locationIds')
        .populate('category', 'name slug')
        .populate('subCategory', 'name slug')
        .sort(sortOptions)
        .skip(skip)
        .limit(limit),
      ProductModal.countDocuments(filter),
    ])

    // Populate wishlist status for each product
    const productsWithWishlist = await (ProductModal as any).populateWishlistStatus(products, user)

    // Get location IDs from the filtered products
    const locationIds = [
      ...new Set(
        productsWithWishlist.flatMap(
          (product: any) => product.locationIds?.map((loc: any) => loc._id?.toString()) || []
        )
      ),
    ].filter(Boolean)

    // Populate the location details based on user's available products
    const Address = (await import('../../models/address/address.model.js')).default
    const availableLocations = await Address.find({ _id: { $in: locationIds } })
      .select('city state country displayName')
      .lean()

    const totalPages = Math.ceil(total / limit)

    return ApiResponse.successWithPagination(
      res,
      {
        products: productsWithWishlist,
        availableLocations,
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
    )
  }),
]

export const getProductById = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params
  const userId = req.user?.id || null

  if (!Types.ObjectId.isValid(id as string)) {
    throw ApiError.badRequest('Invalid product ID')
  }

  const product = await ProductModal.findById(id)
    .populate('seller', 'displayName email avatar profile')
    .populate('category', 'name slug')
    .populate('subCategory', 'name slug')

  if (!product) {
    throw ApiError.notFound('Product not found')
  }

  const productWithWishlist = await (ProductModal as any).populateSingleWishlistStatus(
    product,
    userId
  )

  return ApiResponse.success(res, productWithWishlist, 'Product retrieved successfully')
})

export const getProductBySlug = [
  validate(getProductBySlugSchema, 'params'),
  catchAsync(async (req: Request, res: Response) => {
    const slug: string = req.params['slug'] as string
    const userId = req.user?.id || null

    if (!slug) {
      throw ApiError.badRequest('Invalid product slug')
    }

    const product = await ProductModal.findOne({ slug })
      .populate('seller', 'displayName email avatar profile')
      .populate('category', 'name slug')
      .populate('subCategory', 'name slug')
      .populate('locationIds')

    if (!product) {
      throw ApiError.notFound('Product not found')
    }

    await product.incrementView()

    const productWithWishlist = await (ProductModal as any).populateSingleWishlistStatus(
      product,
      userId
    )

    return ApiResponse.success(res, productWithWishlist, 'Product retrieved successfully')
  }),
]

export const updateProduct = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params
  const updateData: UpdateProductDTO = req.body

  if (!Types.ObjectId.isValid(id as string)) {
    throw ApiError.badRequest('Invalid product ID')
  }

  const product = await ProductModal.findById(id)

  if (!product) {
    throw ApiError.notFound('Product not found')
  }

  if (product.seller.toString() !== req.user?.id) {
    throw ApiError.forbidden('You are not authorized to update this product')
  }

  // Handle variants separately to ensure proper replacement
  const { variants, ...otherUpdateData } = updateData
  
  console.log('UPDATE PRODUCT - Incoming variants:', variants)
  console.log('UPDATE PRODUCT - Current product variants:', product.variants)
  
  // Update all fields except variants
  Object.assign(product, otherUpdateData)
  
  // Replace variants array completely if provided (including empty array to remove all variants)
  if (variants !== undefined) {
    console.log('UPDATE PRODUCT - Replacing variants with:', variants)
    product.variants = variants as any
  } else {
    // If variants is not provided, remove all existing variants
    console.log('UPDATE PRODUCT - Variants not provided, removing all existing variants')
    product.variants = []
  }
  
  product.status = ProductStatus.ACTIVE
  await product.save()
  
  console.log('UPDATE PRODUCT - After save, variants:', product.variants)

  await product.populate('seller', 'displayName email avatar profile')

  return ApiResponse.success(res, product, 'Product updated successfully')
})

export const deleteProduct = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params

  if (!Types.ObjectId.isValid(id as string)) {
    throw ApiError.badRequest('Invalid product ID')
  }

  const product = await ProductModal.findById(id)

  if (!product) {
    throw ApiError.notFound('Product not found')
  }

  if (product.seller.toString() !== req.user?.id && req.user?.role !== 'admin') {
    throw ApiError.forbidden('You are not authorized to delete this product')
  }

  await product.deleteOne()

  return ApiResponse.success(res, null, 'Product deleted successfully')
})

export const toggleProductStatus = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params
  const { status } = req.body

  if (!Types.ObjectId.isValid(id as string)) {
    throw ApiError.badRequest('Invalid product ID')
  }

  if (!status || !['active', 'inactive'].includes(status)) {
    throw ApiError.badRequest('Invalid status. Must be either "active" or "inactive"')
  }

  const product = await ProductModal.findById(id)

  if (!product) {
    throw ApiError.notFound('Product not found')
  }

  if (product.seller.toString() !== req.user?.id && req.user?.role !== 'admin') {
    throw ApiError.forbidden('You are not authorized to update this product status')
  }

  product.status = status === 'active' ? ProductStatus.ACTIVE : ProductStatus.INACTIVE
  await product.save()

  await product.populate('seller', 'displayName email avatar profile')

  return ApiResponse.success(res, product, 'Product status updated successfully')
})

export const updateProductStock = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params
  const { quantity, variants, outOfStock } = req.body

  if (!Types.ObjectId.isValid(id as string)) {
    throw ApiError.badRequest('Invalid product ID')
  }

  const product = await ProductModal.findById(id)

  if (!product) {
    throw ApiError.notFound('Product not found')
  }

  if (product.seller.toString() !== req.user?.id && req.user?.role !== 'admin') {
    throw ApiError.forbidden('You are not authorized to update this product stock')
  }

  // Update main product quantity
  if (quantity !== undefined && quantity !== null) {
    product.quantity = quantity
  }

  if (outOfStock !== undefined && outOfStock !== null) {
    product.outOfStock = outOfStock
  }

  // Update variant quantities if provided
  if (variants && Array.isArray(variants) && product.variants) {
    variants.forEach((variantUpdate: { index: number; quantity: number; outOfStock: boolean }) => {
      if (product.variants && product.variants[variantUpdate.index]) {
        product.variants[variantUpdate.index].outOfStock = variantUpdate.outOfStock
        product.variants[variantUpdate.index].quantity = variantUpdate.quantity
      }
    })
  }

  await product.save()
  await product.populate('seller', 'displayName email avatar profile')

  return ApiResponse.success(res, product, 'Product stock updated successfully')
})

export const getRelatedProducts = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params
  const userId = req.user?.id || null
  const limit = parseInt(String(req.query.limit || '8')) || 8

  if (!Types.ObjectId.isValid(id as string)) {
    throw ApiError.badRequest('Invalid product ID')
  }

  // Get the current product to find its category
  const currentProduct = await ProductModal.findById(id)

  if (!currentProduct) {
    throw ApiError.notFound('Product not found')
  }

  // Find related products based on category and subcategory
  const filter: any = {
    _id: { $ne: currentProduct._id }, // Exclude current product
    status: ProductStatus.ACTIVE,
    $or: [
      { category: currentProduct.category, subCategory: currentProduct.subCategory }, // Same subcategory (highest priority)
      { category: currentProduct.category }, // Same category
      { productTag: { $in: currentProduct.productTag || [] } }, // Similar tags
    ],
  }

  // Fetch related products
  const relatedProducts = await ProductModal.find(filter)
    .populate('seller', 'displayName email avatar profile')
    .populate('category', 'name slug')
    .populate('subCategory', 'name slug')
    .populate('locationIds')
    .sort({
      // Sort by relevance: same subcategory first, then by rating
      subCategory: currentProduct.subCategory === '$subCategory' ? -1 : 1,
      rating: -1,
      views: -1,
    })
    .limit(limit)

  // Populate wishlist status for each product
  const productsWithWishlist = await (ProductModal as any).populateWishlistStatus(
    relatedProducts,
    userId
  )

  return ApiResponse.success(res, productsWithWishlist, 'Related products retrieved successfully')
})
