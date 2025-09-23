import { Request, Response } from 'express';
import { Types } from 'mongoose';
import catchAsync from '@utils/catchAsync.js';
import ApiResponse from '@utils/ApiResponse.js';
import ApiError from '@utils/ApiError.js';
import ContactUsModal from '@models/contactus/index.js';
import { validate } from '@middlewares/validation.middleware.js';
import logger from '@config/logger.js';
import { sendEmail } from '@services/email.service.js';
import config from '@config/index.js';
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
      phone: contactData.phone,
      message: contactData.message,
    });
    
    logger.info('Contact us submission created', { 
      contactId: contactUs._id,
      email: contactData.email 
    });
    
    // Generate reference number
    const referenceNumber = `SB-CONTACT-${contactUs._id.toString().slice(-8).toUpperCase()}`;
    const submissionDate = new Date().toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
    const currentYear = new Date().getFullYear();
    
    // Get request metadata for support email
    const ipAddress = req.ip || req.socket?.remoteAddress || 'Unknown';
    const userAgent = req.headers['user-agent'] || 'Unknown';
    const submissionTime = new Date().toLocaleTimeString('en-US');
    const timeAgo = '0 minutes'; // Just submitted
    
    // Send email to user (confirmation)
    try {
      const userEmailData = {
        email: contactData.email,
        subject: `Thank You for Contacting Source Build - Ref: ${referenceNumber}`,
        firstName: contactData.firstName,
        lastName: contactData.lastName,
        phone: contactData.phone,
        message: contactData.message,
        referenceNumber,
        submissionDate,
        supportEmail: 'support@sourcebuild.com',
        faqUrl: `${config.FRONTEND_URL}/faq`,
        helpCenterUrl: `${config.FRONTEND_URL}/help`,
        termsUrl: `${config.FRONTEND_URL}/terms`,
        privacyUrl: `${config.FRONTEND_URL}/privacy`,
        year: currentYear,
        // sender: 'noreply@sourcebuild.com',
        senderName: 'Source Build'
      };
      
      await sendEmail(userEmailData, 'contact-form-user.ejs');
      logger.info('Confirmation email sent to user', { 
        email: contactData.email,
        referenceNumber 
      });
    } catch (emailError) {
      logger.error('Failed to send confirmation email to user', { 
        error: emailError,
        email: contactData.email 
      });
      // Don't fail the request if email fails
    }
    
    // Send email to support team
    try {
      const supportEmailData = {
        email: 'supportdemo@yopmail.com', // Support email address (recipient)
        subject: `🔔 New Contact Form Submission - ${referenceNumber}`,
        firstName: contactData.firstName,
        lastName: contactData.lastName,
        customerEmail: contactData.email, // Customer's email for display in template
        phone: contactData.phone,
        message: contactData.message,
        referenceNumber,
        submissionDate,
        submissionTime,
        timeAgo,
        contactId: contactUs._id.toString(),
        ipAddress,
        userAgent,
        adminDashboardUrl: `${config.FRONTEND_URL}/admin/auth/login`,
        year: currentYear,
        // sender: 'system@sourcebuild.com',
        senderName: 'Source Build System'
      };
      
      await sendEmail(supportEmailData, 'contact-form-support.ejs');
      logger.info('Notification email sent to support team', { 
        referenceNumber,
        contactId: contactUs._id 
      });
    } catch (emailError) {
      logger.error('Failed to send notification email to support', { 
        error: emailError,
        referenceNumber 
      });
      // Don't fail the request if email fails
    }
    
    // Add reference number to response
    const responseData = {
      ...contactUs.toObject(),
      referenceNumber
    };
    
    return ApiResponse.success(res, responseData, 'Your message has been submitted successfully. We will get back to you within 24-48 hours.');
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
        { phone: { $regex: search, $options: 'i' } },
      ];
    }
    
    // Apply additional filters
    if (query.status) matchStage.status = query.status;
    if (query.email) matchStage.email = query.email.toLowerCase();
    if (query.phone) matchStage.phone = query.phone;
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