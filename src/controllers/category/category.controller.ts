import { Request, Response } from 'express'
import slugify from '@sindresorhus/slugify'
import { Category } from '../../models/category'
import {
  createCategorySchema,
  updateCategorySchema,
  getCategoriesSchema,
  CreateCategoryInput,
  UpdateCategoryInput,
  GetCategoriesQuery,
} from '../../models/category/category.validators'
import catchAsync from '../../utils/catchAsync'
import ApiError from '../../utils/ApiError'
import ApiResponse from '../../utils/ApiResponse'

export const createCategory = catchAsync(async (req: Request, res: Response) => {
  const validatedData = createCategorySchema.parse(req.body) as CreateCategoryInput

  // Check if category with same name already exists
  const existingCategory = await Category.findOne({
    name: new RegExp(`^${validatedData.name}$`, 'i'),
  })

  if (existingCategory) {
    throw ApiError.conflict('Category with this name already exists')
  }

  const category = await Category.create(validatedData)

  return ApiResponse.created(res, category, 'Category created successfully')
})

export const getCategories = catchAsync(async (req: Request, res: Response) => {
  const validatedQuery = getCategoriesSchema.parse(req.query) as GetCategoriesQuery

  const {
    page = 1,
    limit = 10,
    search = '',
    isActive,
    sortBy = 'order',
    sortOrder = 'asc',
  } = validatedQuery

  // Build query
  const query: any = {}

  if (search) {
    query.$or = [{ name: new RegExp(search, 'i') }, { description: new RegExp(search, 'i') }]
  }

  if (isActive === 'true') {
    query.isActive = true
  } else if (isActive === 'false') {
    query.isActive = false
  }

  // Calculate pagination
  const skip = (page - 1) * limit

  // Build sort
  const sort: any = {}
  sort[sortBy] = sortOrder === 'asc' ? 1 : -1

  // Execute query
  const [categories, totalCount] = await Promise.all([
    Category.find(query).sort(sort).skip(skip).limit(limit),
    Category.countDocuments(query),
  ])

  const totalPages = Math.ceil(totalCount / limit)

  return ApiResponse.successWithPagination(
    res,
    categories,
    {
      page: Number(page),
      limit: Number(limit),
      total: totalCount,
      pages: totalPages,
      hasNext: Number(page) < totalPages,
      hasPrev: Number(page) > 1,
    },
    'Categories retrieved successfully'
  )
})

export const getCategoryById = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params

  const category = await Category.findById(id)

  if (!category) {
    throw ApiError.notFound('Category not found')
  }

  return ApiResponse.success(res, category, 'Category fetched successfully')
})

export const getCategoryBySlug = catchAsync(async (req: Request, res: Response) => {
  const { slug } = req.params

  const category = await Category.findOne({ slug })

  if (!category) {
    throw ApiError.notFound('Category not found')
  }

  return ApiResponse.success(res, category, 'Category fetched successfully')
})

export const updateCategory = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params
  const validatedData = updateCategorySchema.parse(req.body) as UpdateCategoryInput

  // Check if category exists
  const category = await Category.findById(id)

  if (!category) {
    throw ApiError.notFound('Category not found')
  }
  const newSlug = slugify(validatedData.name)
  // Prepare update data
  const updateData: any = { ...validatedData, slug: newSlug }
  // If updating name, check for duplicates and generate new slug
  if (validatedData.name && validatedData.name !== category.name) {
    const existingCategory = await Category.findOne({
      name: new RegExp(`^${validatedData.name}$`, 'i'),
      _id: { $ne: id },
    })

    if (existingCategory) {
      throw ApiError.conflict('Category with this name already exists')
    }
  }

  // Update category
  const updatedCategory = await Category.findByIdAndUpdate(id, updateData, {
    new: true,
    runValidators: true,
  })

  return ApiResponse.success(res, updatedCategory, 'Category updated successfully')
})

export const deleteCategory = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params

  const category = await Category.findById(id)

  if (!category) {
    throw ApiError.notFound('Category not found')
  }

  // Check if category has subcategories
  const { Subcategory } = await import('../../models/subcategory')
  const subcategoriesCount = await Subcategory.countDocuments({ category: id })

  if (subcategoriesCount > 0) {
    throw ApiError.badRequest('Cannot delete category with existing subcategories')
  }

  await category.deleteOne()

  return ApiResponse.success(res, null, 'Category deleted successfully')
})

export const toggleCategoryStatus = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params

  const category = await Category.findById(id)

  if (!category) {
    throw ApiError.notFound('Category not found')
  }

  category.isActive = !category.isActive
  await category.save()

  return ApiResponse.success(
    res,
    category,
    `Category ${category.isActive ? 'activated' : 'deactivated'} successfully`
  )
})

export const getAvailableCategories = catchAsync(async (req: Request, res: Response) => {
  const { Product } = await import('../../models/product')
  const { Subcategory } = await import('../../models/subcategory')
  
  // Find all active products and get unique category and subcategory IDs
  const activeProducts = await Product.find({ status: "active" })
  
  if (activeProducts.length === 0) {
    return ApiResponse.success(res, [], 'No available categories')
  }
  
  // Get unique category IDs from products
  const uniqueCategoryIds = [...new Set(activeProducts.map(p => p.category?.toString()).filter(Boolean))]
  
  // Get unique subcategory IDs from products
  const uniqueSubcategoryIds = [...new Set(activeProducts.map(p => p.subCategory?.toString()).filter(Boolean))]
  
  // Get active categories that have active products
  const categories = await Category.find({
    _id: { $in: uniqueCategoryIds },
    isActive: true
  }).sort({ order: 1, name: 1 }).lean()
  
  // Get active subcategories that have active products
  const subcategories = await Subcategory.find({
    _id: { $in: uniqueSubcategoryIds },
    isActive: true
  }).sort({ order: 1, name: 1 }).lean()
  
  // Group subcategories by category and attach to categories
  const categoriesWithSubcategories = categories.map(category => {
    const categorySubcategories = subcategories.filter(
      sub => sub.category?.toString() === category._id.toString()
    )
    return {
      ...category,
      subcategories: categorySubcategories
    }
  })
  
  return ApiResponse.success(res, categoriesWithSubcategories, 'Available categories retrieved successfully')
})
