import { Request, Response, NextFunction } from 'express'
import { UserCard } from '../models/user-card/userCard.model.js'
import UserModal  from '../models/user/user.model.js'
import stripeService from '../services/stripe.service.js'
import stripe from '../config/stripe.js'
import mongoose from 'mongoose'
import catchAsync from '@/utils/catchAsync.js'
import ApiError from '@/utils/ApiError.js'
import ApiResponse from '@/utils/ApiResponse.js'
import { createCardSchema } from '../validators/card.validators.js'



export const createCard = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user?.id

  // Validate request body
  const validatedData = createCardSchema.parse(req.body)
  const { token, cardholderName, isDefault } = validatedData

  // Get user and ensure they have a Stripe customer ID
    const user = await UserModal.findById(userId)
    if (!user) {
      throw ApiError.notFound('User not found')
    }

    // Create Stripe customer if doesn't exist
    let stripeCustomerId = user.stripeCustomerId
    if (!stripeCustomerId) {
      const customer = await stripeService.createOrGetCustomer({
        email: user.email,
        name: user.displayName,
      })
      stripeCustomerId = customer.id
      user.stripeCustomerId = stripeCustomerId
      await user.save()
    }

    // Retrieve token details from Stripe to get card information
    const tokenData = await stripe.tokens.retrieve(token)
    
    if (!tokenData || !tokenData.card) {
      throw ApiError.badRequest('Invalid token or token does not contain card information')
    }

    // Attach payment method to customer using the provided token
    const paymentMethod = await stripeService.attachPaymentMethodToCustomer(
      stripeCustomerId,
      token
    )

    // Save card details in database using token data
    const card = new UserCard({
      userId,
      paymentMethodId: paymentMethod.id,
      last4: tokenData.card.last4,
      brand: tokenData.card.brand,
      expiryMonth: tokenData.card.exp_month,
      expiryYear: tokenData.card.exp_year,
      cardholderName,
      isDefault: isDefault || false,
      tokenId: token, // Store the token ID for reference
    })

    await card.save()

    // If this card is set as default, update Stripe customer
    if (card.isDefault) {
      await stripeService.updateCustomerDefaultPaymentMethod(stripeCustomerId, paymentMethod.id)
    }

  return ApiResponse.success(res, card, 'Card added successfully', 201)
})

export const getSavedCards = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user?.id

  const cards = await UserCard.find({ userId }).sort({ createdAt: -1 })

  return ApiResponse.success(res, cards, 'Cards fetched successfully', 200)
})

// Update and setDefault functions removed - simplified API

export const deleteCard = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user?.id
  const cardId = req.params.id

 
    // Find the card before deleting
    const cardToDelete = await UserCard.findOne({
      _id: new mongoose.Types.ObjectId(cardId),
      userId: new mongoose.Types.ObjectId(userId),
    })

    if (!cardToDelete) {
      throw ApiError.notFound('Card not found')

    }

    // Detach payment method from Stripe
    try {
      await stripeService.detachPaymentMethod(cardToDelete.paymentMethodId)
    } catch (stripeError) {
      console.error('Error detaching payment method from Stripe:', stripeError)
      // Continue with deletion even if Stripe detach fails
    }

    // Delete the card
    await UserCard.findByIdAndDelete(cardId)

    // If deleted card was the default, set another card as default
    if (cardToDelete.isDefault) {
      const anotherCard = await UserCard.findOne({
        userId: new mongoose.Types.ObjectId(userId),
      })

      if (anotherCard) {
        anotherCard.isDefault = true
        await anotherCard.save()

        // Update Stripe customer default payment method
        const user = await UserModal.findById(userId)
        if (user?.stripeCustomerId) {
          await stripeService.updateCustomerDefaultPaymentMethod(
            user.stripeCustomerId,
            anotherCard.paymentMethodId
          )
        }
      }
    }

  return ApiResponse.success(res, null, 'Card deleted successfully', 200)
})


export const setDefaultCard = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user?.id
  const cardId = req.params.id



    const card = await UserCard.findOne({
      _id: new mongoose.Types.ObjectId(cardId),
      userId: new mongoose.Types.ObjectId(userId),
    })

    if (!card) {
        throw ApiError.notFound('Card not found')
    }

    // Remove default status from all other cards
    await UserCard.updateMany(
      { userId: new mongoose.Types.ObjectId(userId), _id: { $ne: card._id } },
      { isDefault: false }
    )

    // Set this card as default
    card.isDefault = true
    await card.save()

    // Update Stripe customer default payment method
    const user = await UserModal.findById(userId)
    if (user?.stripeCustomerId) {
      await stripeService.updateCustomerDefaultPaymentMethod(
        user.stripeCustomerId,
        card.paymentMethodId
      )
    }
  return ApiResponse.success(res, card, 'Default card updated successfully', 200)
})
