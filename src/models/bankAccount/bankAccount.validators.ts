import { z } from 'zod';
import { AccountType } from './bankAccount.types.js';

export const createBankAccountSchema = z.object({
  body: z.object({
    accountHolderName: z
      .string()
      .trim()
      .min(1, 'Account holder name is required')
      .min(2, 'Account holder name must be at least 2 characters')
      .max(100, 'Account holder name must not exceed 100 characters'),
    bankName: z
      .string()
      .trim()
      .min(1, 'Bank name is required')
      .min(2, 'Bank name must be at least 2 characters')
      .max(100, 'Bank name must not exceed 100 characters'),
    accountNumber: z
      .string()
      .trim()
      .min(1, 'Account number is required')
      .regex(/^[0-9]+$/, 'Account number must contain only digits')
      .min(8, 'Account number must be at least 8 digits')
      .max(20, 'Account number must not exceed 20 digits'),
    routingNumber: z
      .string()
      .trim()
      .min(1, 'Routing number is required')
      .regex(/^[0-9]+$/, 'Routing number must contain only digits')
      .length(9, 'Routing number must be exactly 9 digits'),
    swiftCode: z
      .string()
      .trim()
      .min(1, 'SWIFT/BIC code is required')
      .regex(/^[A-Z]{6}[A-Z0-9]{2}([A-Z0-9]{3})?$/, 'Invalid SWIFT/BIC code format')
      .max(11, 'SWIFT/BIC code must not exceed 11 characters'),
    accountType: z.nativeEnum(AccountType),
    isDefault: z.boolean().optional(),
  }),
});

export const updateBankAccountSchema = z.object({
  params: z.object({
    id: z.string().min(1, 'Account ID is required'),
  }),
  body: z.object({
    accountHolderName: z
      .string()
      .trim()
      .min(2, 'Account holder name must be at least 2 characters')
      .max(100, 'Account holder name must not exceed 100 characters')
      .optional(),
    bankName: z
      .string()
      .trim()
      .min(2, 'Bank name must be at least 2 characters')
      .max(100, 'Bank name must not exceed 100 characters')
      .optional(),
    accountNumber: z
      .string()
      .trim()
      .regex(/^[0-9]+$/, 'Account number must contain only digits')
      .min(8, 'Account number must be at least 8 digits')
      .max(20, 'Account number must not exceed 20 digits')
      .optional(),
    routingNumber: z
      .string()
      .trim()
      .regex(/^[0-9]+$/, 'Routing number must contain only digits')
      .length(9, 'Routing number must be exactly 9 digits')
      .optional(),
    swiftCode: z
      .string()
      .trim()
      .regex(/^[A-Z]{6}[A-Z0-9]{2}([A-Z0-9]{3})?$/, 'Invalid SWIFT/BIC code format')
      .max(11, 'SWIFT/BIC code must not exceed 11 characters')
      .optional(),
    accountType: z.nativeEnum(AccountType).optional(),
    isDefault: z.boolean().optional(),
  }),
});

export const getBankAccountSchema = z.object({
  params: z.object({
    id: z.string().min(1, 'Account ID is required'),
  }),
});

export const deleteBankAccountSchema = z.object({
  params: z.object({
    id: z.string().min(1, 'Account ID is required'),
  }),
});

export const setDefaultBankAccountSchema = z.object({
  params: z.object({
    id: z.string().min(1, 'Account ID is required'),
  }),
});

export const getUserBankAccountsSchema = z.object({
  query: z.object({
    page: z.string().optional(),
    limit: z.string().optional(),
    includeInactive: z.string().optional(),
  }),
});