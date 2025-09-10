import { Request, Response } from 'express'
import mongoose from 'mongoose'
import VehicleModal, { IVehicle } from '@models/vehicle/vehicle.schema.js'
import ApiError from '@utils/ApiError.js'
import catchAsync from '@utils/catchAsync.js'
import ApiResponse from '@utils/ApiResponse.js'
import UserModal from '@models/user/user.model.js'
/**
 * Create or update vehicle for a driver
 */
export const createOrUpdateVehicle = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user?.id

  if (!userId) {
    throw ApiError.badRequest('User not authenticated')
  }

  // Check if user is a driver
  const user = await UserModal.findById(userId)
  if (!user || user.role !== 'driver') {
    throw ApiError.badRequest('Only drivers can add vehicles')
  }

  const {
    vehicleType,
    vehicleManufacturer,
    vehicleModel,
    vehicleRegistrationNumber,
    vehicleImages,
    insuranceImages,
  } = req.body

  // Validate required fields
  if (!vehicleType || !vehicleManufacturer || !vehicleModel || !vehicleRegistrationNumber) {
    throw ApiError.badRequest('Missing required vehicle information')
  }

  // Check if vehicle with this registration already exists
  const existingVehicle = await VehicleModal.findOne({
    vehicleRegistrationNumber: vehicleRegistrationNumber.toUpperCase(),
  })

  if (existingVehicle && existingVehicle.userId.toString() !== userId) {
    throw ApiError.badRequest('Vehicle with this registration number already exists')
  }

  let vehicle: IVehicle

  if (existingVehicle) {
    // Update existing vehicle
    vehicle = await VehicleModal.findByIdAndUpdate(
      existingVehicle._id,
      {
        vehicleType,
        vehicleManufacturer,
        vehicleModel,
        vehicleImages: vehicleImages || [],
        insuranceImages: insuranceImages || [],
      },
      { new: true, runValidators: true }
    )
  } else {
    // Create new vehicle
    vehicle = await VehicleModal.create({
      userId,
      vehicleType,
      vehicleManufacturer,
      vehicleModel,
      vehicleRegistrationNumber,
      vehicleImages: vehicleImages || [],
      insuranceImages: insuranceImages || [],
    })

    // Update user's isVehicles flag
    await UserModal.findByIdAndUpdate(
      userId,
      { $set: { 'profile.isVehicles': true } },
      { new: true }
    )
  }

  return ApiResponse.success(res, vehicle, 'Vehicle information saved successfully', 201)
})

/**
 * Create or update vehicle for a driver
 */
export const createOrUpdateLicense = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user?.id

  if (!userId) {
    throw ApiError.badRequest('User not authenticated')
  }

  // Check if user is a driver
  const user = await UserModal.findById(userId)
  if (!user || user.role !== 'driver') {
    throw ApiError.badRequest('Only drivers can add license')
  }

  const { licenseNumber, licenseImages } = req.body

  // Validate required fields
  if (!licenseNumber || !licenseImages) {
    throw ApiError.badRequest('Missing required vehicle information')
  }
  // Create new license
  console.log('userId-sss', userId, licenseNumber, licenseImages)
  const license = await UserModal.findOneAndUpdate(
    { _id: userId }, // This should be the filter
    {
      $set: {
        // This should be the update
        'profile.driverLicense': {
          number: licenseNumber,
          licenceImages: licenseImages,
          verified: false,
        },
      },
    },
    { new: true, runValidators: true }
  )

  console.log('license', license)

  // Update user's isLicense flag
  await UserModal.findByIdAndUpdate(userId, { $set: { 'profile.isLicense': true } }, { new: true })

  return ApiResponse.success(res, license, 'License information saved successfully', 201)
})

/**
 * Get all vehicles for a driver
 */
export const getDriverVehicles = catchAsync(async (req: Request, res: Response) => {
  const query = req.query
  const userId = req.user?.id
  const page = parseInt(String(query['page'] || '1')) || 1
  const limit = parseInt(String(query['limit'] || '10')) || 10
  const skip = (page - 1) * limit

  if (!userId) {
    throw ApiError.notFound('User not found')
  }
  let filter = {
    userId,
    isActive: true,
  }

  const [vehicle, total] = await Promise.all([
    VehicleModal.find(filter)

      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      ,
    VehicleModal.countDocuments(filter),
  ])

  const totalPages = Math.ceil(total / limit)
  return ApiResponse.successWithPagination(
    res,
    vehicle,
    {
      page,
      limit,
      total,
      pages: totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    },
    'Vehicle fetched successfully',
    200
  )
})

/**
 * Get single vehicle by ID
 */
export const getVehicleById = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params
  const userId = req.user?.id

  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw ApiError.badRequest('Invalid vehicle ID')
  }

  const vehicle = await VehicleModal.findOne({
    _id: id,
    userId,
    isActive: true,
  })

  if (!vehicle) {
    throw ApiError.notFound('Vehicle not found')
  }

  return ApiResponse.success(res, vehicle, 'Vehicle fetched successfully', 200)
})

/**
 * Update vehicle
 */
export const updateVehicle = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params
  const userId = req.user?.id

  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw ApiError.badRequest('Invalid vehicle ID')
  }

  const vehicle = await VehicleModal.findOneAndUpdate({ _id: id, userId }, req.body, {
    new: true,
    runValidators: true,
  })

  if (!vehicle) {
    throw ApiError.notFound('Vehicle not found')
  }

  res.json(ApiResponse.success(res, vehicle, 'Vehicle updated successfully', 200))
})

/**
 * Delete vehicle (soft delete)
 */
export const deleteVehicle = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params
  const userId = req.user?.id

  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw ApiError.badRequest('Invalid vehicle ID')
  }

  const vehicle = await VehicleModal.findOneAndUpdate(
    { _id: id, userId },
    { isActive: false },
    { new: true }
  )

  if (!vehicle) {
    throw ApiError.notFound('Vehicle not found')
  }

  // Check if user has any other active vehicles
  const activeVehicles = await VehicleModal.countDocuments({
    userId,
    isActive: true,
  })

  // Update user's isVehicles flag if no more active vehicles
  if (activeVehicles === 0) {
    const user = await UserModal.findById(userId)
    if (user && user.profile && 'isVehicles' in user.profile) {
      ;(user.profile as any).isVehicles = false
      await user.save()
    }
  }

  return ApiResponse.success(res, null, 'Vehicle deleted successfully', 200)
})

/**
 * Restore deleted vehicle
 */
export const restoreVehicle = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params
  const userId = req.user?.id

  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw ApiError.badRequest('Invalid vehicle ID')
  }

  const vehicle = await VehicleModal.findOneAndUpdate(
    { _id: id, userId },
    { isActive: true },
    { new: true }
  )

  if (!vehicle) {
    throw ApiError.notFound('Vehicle not found')
  }

  // Update user's isVehicles flag
  const user = await UserModal.findById(userId)
  if (user && user.profile && 'isVehicles' in user.profile) {
    ;(user.profile as any).isVehicles = true
    await user.save()
  }

  return ApiResponse.success(res, vehicle, 'Vehicle restored successfully', 200)
})
