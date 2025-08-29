import { Request, Response } from 'express';
import { Types } from 'mongoose';
import { validate } from '@/middlewares/validation.middleware.js';
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
  validate(createBankAccountSchema),
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
  validate(getUserBankAccountsSchema),
  catchAsync(async (req: Request, res: Response) => {
    const userId = new Types.ObjectId(req.user?.id);
    const { includeInactive } = req.query;

    let query: any = { user: userId };
    if (includeInactive !== 'true') {
      query.isActive = true;
    }

    const bankAccounts = await BankAccountModal.find(query).sort({ isDefault: -1, createdAt: -1 });

    return ApiResponse.success(res, bankAccounts, 'Bank accounts fetched successfully');
  }),
];

export const getBankAccount = [
  validate(getBankAccountSchema),
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
  validate(updateBankAccountSchema),
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
  validate(deleteBankAccountSchema),
  catchAsync(async (req: Request, res: Response) => {
    const userId = new Types.ObjectId(req.user?.id);
    const accountId = new Types.ObjectId(req.params['id']);

    const bankAccount = await BankAccountModal.findByIdAndUser(accountId, userId);

    if (!bankAccount) {
      throw ApiError.notFound('Bank account not found');
    }

    // Soft delete the account
    await bankAccount.softDelete();

    // If this was the default account, set another as default
    if (bankAccount.isDefault) {
      const otherAccount = await BankAccountModal.findOne({
        user: userId,
        isActive: true,
        _id: { $ne: accountId },
      }).sort({ createdAt: -1 });

      if (otherAccount) {
        await otherAccount.setAsDefault();
      }
    }

    return ApiResponse.success(res, null, 'Bank account deleted successfully');
  }),
];

export const setDefaultBankAccount = [
  validate(setDefaultBankAccountSchema),
  catchAsync(async (req: Request, res: Response) => {
    const userId = new Types.ObjectId(req.user?.id);
      const accountId = new Types.ObjectId(req.params['id']);

    const bankAccount = await BankAccountModal.findByIdAndUser(accountId, userId);

    if (!bankAccount) {
      throw ApiError.notFound('Bank account not found');
    }

    await bankAccount.setAsDefault();

    return ApiResponse.success(res, bankAccount, 'Default bank account updated successfully');
  }),
];

export const getDefaultBankAccount = [
  catchAsync(async (req: Request, res: Response) => {
    const userId = new Types.ObjectId(req.user?.id);

    const defaultAccount = await BankAccountModal .findDefaultAccount(userId);

    if (!defaultAccount) {
      return ApiResponse.success(res, null, 'No default bank account found');
    }

    return ApiResponse.success(res, defaultAccount, 'Default bank account fetched successfully');
  }),
];