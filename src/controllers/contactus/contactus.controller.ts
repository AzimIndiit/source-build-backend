import { Request, Response } from 'express';
import { Types } from 'mongoose';
import catchAsync from '@utils/catchAsync.js';
import ApiResponse from '@utils/ApiResponse.js';
import ApiError from '@utils/ApiError.js';
import ContactUsModal from '@models/contactus/index.js';
import { validate } from '@middlewares/validation.middleware.js';
import logger from '@config/logger.js';
import {
  createContactUsSchema,
  updateContactUsSchema,
  contactUsFilterSchema,
  contactUsIdSchema,
  CreateContactUsInput,
  UpdateContactUsInput,
  ContactUsFilterInput,
} from '@models/contactus/contactus.validators.js';

/**
 * Create a new contact us submission
 */
export const createContactUs = [
  validate(createContactUsSchema),
  catchAsync(async (req: Request, res: Response) => {
    const contactData: CreateContactUsInput = req.body;
    
    const contactUs = await ContactUsModal.create({
      firstName: contactData.firstName,
      lastName: contactData.lastName,
      email: contactData.email,
      message: contactData.message,
    });
    
    logger.info('Contact us submission created', { 
      contactId: contactUs._id,
      email: contactData.email 
    });
    
    return ApiResponse.success(res, contactUs, 'Details submitted successfully');
  })
];

/**
 * Get all contact us submissions with filters
 */
export const getAllContactUs = [
  validate(contactUsFilterSchema),
  catchAsync(async (req: Request, res: Response) => {
    const query: ContactUsFilterInput = req.query as any;
    
    const search = query.search || '';
    const page = query.page || 1;
    const limit = query.limit || 10;
    const skip = (page - 1) * limit;
    
    const matchStage: any = {};
    
    if (search) {
      matchStage.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }
    
    // Apply additional filters
    if (query.status) matchStage.status = query.status;
    if (query.email) matchStage.email = query.email.toLowerCase();
    
    if (query.startDate || query.endDate) {
      matchStage.createdAt = {};
      if (query.startDate) matchStage.createdAt.$gte = new Date(query.startDate);
      if (query.endDate) matchStage.createdAt.$lte = new Date(query.endDate);
    }
    
    const [contacts, totalContacts] = await Promise.all([
      ContactUsModal.find(matchStage)
        .populate('resolvedBy', 'firstName lastName email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      ContactUsModal.countDocuments(matchStage)
    ]);
    
    const totalPages = Math.ceil(totalContacts / limit);
    
    const response = {
      contacts: contacts || [],
      totalCount: totalContacts || 0,
      currentPage: page,
      totalPages,
    };
    
    return ApiResponse.success(res, response, 'Contact list fetched successfully');
  })
];

/**
 * Update contact us submission status
 */
export const updateContactUs = [
  validate(contactUsIdSchema),
  validate(updateContactUsSchema),
  catchAsync(async (req: Request, res: Response) => {
    const { id } = req.params;
    const updateData: UpdateContactUsInput = req.body;
    
    if (!Types.ObjectId.isValid(id as string  )) {
      throw ApiError.badRequest('Invalid contact ID');
    }
    
    const contactUs = await ContactUsModal.findById(id as string);
    
    if (!contactUs) {
      throw ApiError.notFound('Contact not found');
    }
    
    // Update status if provided
    if (updateData.status) {
      contactUs.status = updateData.status;
    }
    
    // Update notes if provided
    if (updateData.notes) {
      contactUs.notes = updateData.notes;
    }
    
    // Set resolvedBy if updating status
    if (updateData.status && req.user?.id) {
      contactUs.resolvedBy = new Types.ObjectId(req.user.id);
    }
    
    await contactUs.save();
    
    logger.info('Contact us submission updated', { 
      contactId: contactUs._id,
      status: contactUs.status 
    });
    
    return ApiResponse.success(res, contactUs, 'Contact updated successfully');
  })
];

export default {
  createContactUs,
  getAllContactUs,
  updateContactUs,
};