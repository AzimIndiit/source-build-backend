import { Request, Response } from 'express'
import Attribute from '../../models/subcategory/attributes.model' 
import catchAsync from '../../utils/catchAsync'
import ApiError from '../../utils/ApiError'
import ApiResponse from '../../utils/ApiResponse'
import { 
  createAttributeSchema, 
  updateAttributeSchema,
  getAttributesSchema,
  CreateAttributeInput,
  UpdateAttributeInput,
  GetAttributesQuery
} from '../../models/subcategory/attributes.validators'

export const createAttribute = catchAsync(async (req: Request, res: Response) => {
  const validatedData = createAttributeSchema.parse(req.body) as CreateAttributeInput



  // Check if attribute with same name exists for this subcategory
  const existingAttribute = await Attribute.findOne({
    name: new RegExp(`^${validatedData.name}$`, 'i'),
  })

  if (existingAttribute) {
    throw ApiError.conflict('Attribute with this name already exists')
  }

  const attribute = await Attribute.create(validatedData)
  const populatedAttribute = await Attribute.findById(attribute._id)

  return ApiResponse.created(res, populatedAttribute, 'Attribute created successfully')
})

export const getAttributes = catchAsync(async (req: Request, res: Response) => {
  const validatedQuery = getAttributesSchema.parse(req.query) as GetAttributesQuery

  const {
    page = 1,
    limit = 10,
    search = '',
    inputType,
    isActive,
    sortBy = 'order',
    sortOrder = 'asc'
  } = validatedQuery

  // Build query
  const query: any = {}

  if (search) {
    query.name = new RegExp(search, 'i')
  }



  if (inputType) {
    query.inputType = inputType
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
  const [attributes, totalCount] = await Promise.all([
    Attribute.find(query)
      .sort(sort)
      .skip(skip)
      .limit(limit),
    Attribute.countDocuments(query)
  ])

  const totalPages = Math.ceil(totalCount / limit)

  return ApiResponse.successWithPagination(
    res,
    attributes,
    {
      page: Number(page),
      limit: Number(limit),
      total: totalCount,
      pages: totalPages,
      hasNext: Number(page) < totalPages,
      hasPrev: Number(page) > 1
    },
    'Attributes retrieved successfully'
  )
})

export const getAttributeById = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params

  const attribute = await Attribute.findById(id)

  if (!attribute) {
    throw ApiError.notFound('Attribute not found')
  }

  return ApiResponse.success(res, attribute, 'Attribute fetched successfully')
})

export const getAttributesBySubcategory = catchAsync(async (req: Request, res: Response) => {
  const { subcategoryId } = req.params

  const attributes = await Attribute.find({ 
    subcategory: subcategoryId,
    isActive: true 
  }).sort({ order: 1 })

  return ApiResponse.success(res, attributes, 'Attributes fetched successfully')
})

export const updateAttribute = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params
  const validatedData = updateAttributeSchema.parse(req.body) as UpdateAttributeInput

  // Check if attribute exists
  const attribute = await Attribute.findById(id)

  if (!attribute) {
    throw ApiError.notFound('Attribute not found')
  }



  // If updating name, check for duplicates within the same subcategory

  if (validatedData.name && validatedData.name !== attribute.name) {
    const existingAttribute = await Attribute.findOne({
      name: new RegExp(`^${validatedData.name}$`, 'i'),
      _id: { $ne: id }
    })

    if (existingAttribute) {
      throw ApiError.conflict('Attribute with this name already exists for this subcategory')
    }
  }

  // Update attribute
  const updatedAttribute = await Attribute.findByIdAndUpdate(
    id,
    validatedData,
    {
      new: true,
      runValidators: true
    }
  )

  return ApiResponse.success(res, updatedAttribute, 'Attribute updated successfully')
})

export const deleteAttribute = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params

  const attribute = await Attribute.findById(id)

  if (!attribute) {
    throw ApiError.notFound('Attribute not found')
  }

  await attribute.deleteOne()

  return ApiResponse.success(res, null, 'Attribute deleted successfully')
})

export const toggleAttributeStatus = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params

  const attribute = await Attribute.findById(id)

  if (!attribute) {
    throw ApiError.notFound('Attribute not found')
  }

  attribute.isActive = !attribute.isActive
  await attribute.save()

  const populatedAttribute = await Attribute.findById(id)

  return ApiResponse.success(
    res,
    populatedAttribute,
    `Attribute ${attribute.isActive ? 'activated' : 'deactivated'} successfully`
  )
})