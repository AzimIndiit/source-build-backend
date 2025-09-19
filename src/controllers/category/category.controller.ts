import { Request, Response } from 'express'
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

  if (typeof isActive === 'boolean') {
    query.isActive = isActive
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

  // If updating name, check for duplicates
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
  const updatedCategory = await Category.findByIdAndUpdate(id, validatedData, {
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
