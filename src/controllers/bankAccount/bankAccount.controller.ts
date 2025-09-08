import { Request, Response } from 'express';
import { Types } from 'mongoose';
import { validate, validateRequest } from '@/middlewares/validation.middleware.js';
import catchAsync from '@utils/catchAsync.js';
import ApiResponse from '@utils/ApiResponse.js';
import ApiError from '@utils/ApiError.js';
import BankAccountModal from '@models/bankAccount/bankAccount.model.js';
import {
  createBankAccountSchema,
  updateBankAccountSchema,
  getBankAccountSchema,
  deleteBankAccountSchema,
  setDefaultBankAccountSchema,
  getUserBankAccountsSchema,
} from '@models/bankAccount/bankAccount.validators.js';
import { CreateBankAccountDTO, UpdateBankAccountDTO } from '@models/bankAccount/bankAccount.types.js';

export const createBankAccount = [
  validate(createBankAccountSchema.shape.body, 'body'),
  catchAsync(async (req: Request, res: Response) => {
    const userId = new Types.ObjectId(req.user?.id);
    const bankAccountData: CreateBankAccountDTO = req.body;

    // Check if user already has bank accounts
    const existingAccounts = await BankAccountModal.findUserAccounts(userId);
    
    // If this is the first account or isDefault is true, set it as default
    const isDefault = bankAccountData.isDefault || existingAccounts.length === 0;

    // If setting as default, unset other defaults
    if (isDefault && existingAccounts.length > 0) {
      await BankAccountModal.updateMany(
        { user: userId },
        { $set: { isDefault: false } }
      );
    }

    const bankAccount = await BankAccountModal.create({
      ...bankAccountData,
      user: userId,
      isDefault,
    });

    return ApiResponse.created(res, bankAccount, 'Bank account added successfully');
  }),
];

export const getUserBankAccounts = [
  // Skip validation for query params due to read-only issue
  catchAsync(async (req: Request, res: Response) => {
    console.log('req.user', req.user)
    const userId = new Types.ObjectId(req.user?.id);
    const { includeInactive } = req.query as { includeInactive?: string };

    let query: any = { user: userId };
    if (includeInactive !== 'true') {
      query.isActive = true;
    }

    const bankAccounts = await BankAccountModal.find(query).sort({createdAt: -1 });
console.log('bankAccounts', bankAccounts)
    return ApiResponse.success(res, bankAccounts, 'Bank accounts fetched successfully');
  }),
];

export const getBankAccount = [
  validate(getBankAccountSchema.shape.params, 'params'),
  catchAsync(async (req: Request, res: Response) => {
    const userId = new Types.ObjectId(req.user?.id);
    const accountId = new Types.ObjectId(req.params['id']);

    const bankAccount = await BankAccountModal.findByIdAndUser(accountId, userId);

    if (!bankAccount) {
      throw ApiError.notFound('Bank account not found');
    }

    return ApiResponse.success(res, bankAccount, 'Bank account fetched successfully');
  }),
];

export const updateBankAccount = [
  validateRequest({
    params: updateBankAccountSchema.shape.params,
    body: updateBankAccountSchema.shape.body,
  }),
  catchAsync(async (req: Request, res: Response) => {
    const userId = new Types.ObjectId(req.user?.id);
    const accountId = new Types.ObjectId(req.params['id']);
    const updateData: UpdateBankAccountDTO = req.body;

    const bankAccount = await BankAccountModal.findByIdAndUser(accountId, userId);

    if (!bankAccount) {
      throw ApiError.notFound('Bank account not found');
    }

    // If setting as default, unset other defaults
    if (updateData.isDefault === true) {
      await BankAccountModal.updateMany(
        { user: userId, _id: { $ne: accountId } },
        { $set: { isDefault: false } }
      );
    }

    Object.assign(bankAccount, updateData);
    await bankAccount.save();

    return ApiResponse.success(res, bankAccount, 'Bank account updated successfully');
  }),
];

export const deleteBankAccount = [
  validate(deleteBankAccountSchema.shape.params, 'params'),
  catchAsync(async (req: Request, res: Response) => {
    const userId = new Types.ObjectId(req.user?.id);
    const accountId = new Types.ObjectId(req.params['id']);

    const bankAccount = await BankAccountModal.findByIdAndUser(accountId, userId);

    if (!bankAccount) {
      throw ApiError.notFound('Bank account not found');
    }

    // Check if this was the default account before deletion
    const wasDefault = bankAccount.isDefault;

    // Permanently delete the account
    await BankAccountModal.deleteOne({ _id: accountId });

    // If this was the default account, set another as default
    if (wasDefault) {
      const otherAccount = await BankAccountModal.findOne({
        user: userId,
        isActive: true,
        _id: { $ne: accountId },
      }).sort({ createdAt: -1 });

      if (otherAccount) {
        // Unset all other defaults for this user first
        await BankAccountModal.updateMany(
          { user: userId, _id: { $ne: otherAccount._id } },
          { $set: { isDefault: false } }
        );
        
        // Set the selected account as default
        otherAccount.isDefault = true;
        await otherAccount.save();
      }
    }

    return ApiResponse.success(res, null, 'Bank account deleted successfully');
  }),
];

export const setDefaultBankAccount = [
  validate(setDefaultBankAccountSchema.shape.params, 'params'),
  catchAsync(async (req: Request, res: Response) => {
    const userId = new Types.ObjectId(req.user?.id);
    const accountId = new Types.ObjectId(req.params['id']);

    const bankAccount = await BankAccountModal.findByIdAndUser(accountId, userId);

    if (!bankAccount) {
      throw ApiError.notFound('Bank account not found');
    }

    // Unset all other defaults for this user
    await BankAccountModal.updateMany(
      { user: userId, _id: { $ne: accountId } },
      { $set: { isDefault: false } }
    );

    // Set this account as default
    await bankAccount.setAsDefault();

    return ApiResponse.success(res, bankAccount, 'Default bank account updated successfully');
  }),
];

export const getDefaultBankAccount = [
  catchAsync(async (req: Request, res: Response) => {
    const userId = new Types.ObjectId(req.user?.id);

    const defaultAccount = await BankAccountModal.findOne({
      user: userId,
      isDefault: true,
      isActive: true,
    });

    if (!defaultAccount) {
      // Try to find any active account
      const anyAccount = await BankAccountModal.findOne({
        user: userId,
        isActive: true,
      }).sort({ createdAt: -1 });

      if (anyAccount) {
        // Set it as default
        await anyAccount.setAsDefault();
        return ApiResponse.success(res, anyAccount, 'Default bank account fetched successfully');
      }

      return ApiResponse.success(res, null, 'No bank accounts found');
    }

    return ApiResponse.success(res, defaultAccount, 'Default bank account fetched successfully');
  }),
];
