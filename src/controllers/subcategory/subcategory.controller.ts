import { Request, Response } from 'express'
import { Subcategory } from '../../models/subcategory'
import { Category } from '../../models/category'
import {
  createSubcategorySchema,
  updateSubcategorySchema,
  getSubcategoriesSchema,
  CreateSubcategoryInput,
  UpdateSubcategoryInput,
  GetSubcategoriesQuery,
} from '../../models/subcategory/subcategory.validators'
import ApiError from '../../utils/ApiError'
import ApiResponse from '../../utils/ApiResponse'
import catchAsync from '../../utils/catchAsync'

export const createSubcategory = catchAsync(async (req: Request, res: Response) => {
  const validatedData = createSubcategorySchema.parse(req.body) as CreateSubcategoryInput

  // Check if category exists
  const category = await Category.findById(validatedData.category)
  if (!category) {
    throw ApiError.notFound('Category not found')
  }

  // Check if subcategory with same name exists in the category
  const existingSubcategory = await Subcategory.findOne({
    name: new RegExp(`^${validatedData.name}$`, 'i'),
    category: validatedData.category,
  })

  if (existingSubcategory) {
    throw ApiError.conflict('Subcategory with this name already exists in this category')
  }

  const subcategory = await Subcategory.create(validatedData)

  // Populate category data
  await subcategory.populate('category')

  return ApiResponse.created(res, subcategory, 'Subcategory created successfully')
})

export const getSubcategories = catchAsync(async (req: Request, res: Response) => {
  const validatedQuery = getSubcategoriesSchema.parse(req.query) as GetSubcategoriesQuery

  const {
    page = 1,
    limit = 10,
    search = '',
    category,
    isActive,
    sortBy = 'order',
    sortOrder = 'asc',
  } = validatedQuery

  // Build query
  const query: any = {}

  if (search) {
    query.$or = [{ name: new RegExp(search, 'i') }, { description: new RegExp(search, 'i') }]
  }

  if (category) {
    query.category = category
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
  const [subcategories, totalCount] = await Promise.all([
    Subcategory.find(query).populate('category', 'name slug').sort(sort).skip(skip).limit(limit),
    Subcategory.countDocuments(query),
  ])

  const totalPages = Math.ceil(totalCount / limit)

  return ApiResponse.successWithPagination(
    res,
    subcategories,
    {
      page: Number(page),
      limit: Number(limit),
      total: totalCount,
      pages: totalPages,
      hasNext: Number(page) < totalPages,
      hasPrev: Number(page) > 1,
    },
    'Subcategories retrieved successfully'
  )
})

export const getSubcategoryById = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params

  const subcategory = await Subcategory.findById(id).populate('category')

  if (!subcategory) {
    throw ApiError.notFound('Subcategory not found')
  }

  return ApiResponse.success(res, subcategory, 'Subcategory fetched successfully')
})

export const getSubcategoryBySlug = catchAsync(async (req: Request, res: Response) => {
  const { slug } = req.params

  const subcategory = await Subcategory.findOne({ slug }).populate('category')

  if (!subcategory) {
    throw ApiError.notFound('Subcategory not found')
  }

  return ApiResponse.success(res, subcategory, 'Subcategory fetched successfully')
})

export const getSubcategoriesByCategory = catchAsync(async (req: Request, res: Response) => {
  const { categoryId } = req.params

  // Check if category exists
  const category = await Category.findById(categoryId)
  if (!category) {
    throw ApiError.notFound('Category not found')
  }

  const subcategories = await Subcategory.find({
    category: categoryId,
    isActive: true,
  }).sort({ order: 1, name: 1 })

  return ApiResponse.success(res, subcategories, 'Subcategories fetched successfully')
})

export const updateSubcategory = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params
  const validatedData = updateSubcategorySchema.parse(req.body) as UpdateSubcategoryInput

  // Check if subcategory exists
  const subcategory = await Subcategory.findById(id)

  if (!subcategory) {
    throw ApiError.notFound('Subcategory not found')
  }

  // If updating category, check if new category exists
  if (validatedData.category) {
    const category = await Category.findById(validatedData.category)
    if (!category) {
      throw ApiError.notFound('Category not found')
    }
  }

  // If updating name, check for duplicates in the same category
  if (validatedData.name && validatedData.name !== subcategory.name) {
    const categoryId = validatedData.category || subcategory.category
    const existingSubcategory = await Subcategory.findOne({
      name: new RegExp(`^${validatedData.name}$`, 'i'),
      category: categoryId,
      _id: { $ne: id },
    })

    if (existingSubcategory) {
      throw ApiError.conflict('Subcategory with this name already exists in this category')
    }
  }

  // Update subcategory
  const updatedSubcategory = await Subcategory.findByIdAndUpdate(id, validatedData, {
    new: true,
    runValidators: true,
  }).populate('category')

  return ApiResponse.success(res, updatedSubcategory, 'Subcategory updated successfully')
})

export const deleteSubcategory = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params

  const subcategory = await Subcategory.findById(id)

  if (!subcategory) {
    throw ApiError.notFound('Subcategory not found')
  }

  await subcategory.deleteOne()

  return ApiResponse.success(res, null, 'Subcategory deleted successfully')
})

export const toggleSubcategoryStatus = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params

  const subcategory = await Subcategory.findById(id)

  if (!subcategory) {
    throw ApiError.notFound('Subcategory not found')
  }

  subcategory.isActive = !subcategory.isActive
  await subcategory.save()
  await subcategory.populate('category')

  return ApiResponse.success(
    res,
    subcategory,
    `Subcategory ${subcategory.isActive ? 'activated' : 'deactivated'} successfully`
  )
})
