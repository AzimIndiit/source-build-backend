import { Document, Model, Types } from 'mongoose';

export enum AccountType {
  CHECKING = 'checking',
  SAVINGS = 'savings',
  CURRENT = 'current',
}

export interface IBankAccountBase {
  user: Types.ObjectId;
  accountHolderName: string;
  bankName: string;
  accountNumber: string;
  routingNumber: string;
  swiftCode: string;
  accountType: AccountType;
  isDefault: boolean;
  isActive: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IBankAccount extends IBankAccountBase, Document, IBankAccountMethods {
  _id: Types.ObjectId;
}

export interface IBankAccountMethods {
  getMaskedAccountNumber(): string;
  setAsDefault(): Promise<void>;
  softDelete(): Promise<void>;
}

export interface IBankAccountStatics {
  findUserAccounts(userId: Types.ObjectId): Promise<IBankAccount[]>;
  findDefaultAccount(userId: Types.ObjectId): Promise<IBankAccount | null>;
  setDefaultAccount(userId: Types.ObjectId, accountId: Types.ObjectId): Promise<void>;
  findByIdAndUser(accountId: Types.ObjectId, userId: Types.ObjectId): Promise<IBankAccount | null>;
}

export interface IBankAccountModel extends Model<IBankAccount, {}, IBankAccountMethods>, IBankAccountStatics {}

export interface CreateBankAccountDTO {
  accountHolderName: string;
  bankName: string;
  accountNumber: string;
  routingNumber: string;
  swiftCode: string;
  accountType: AccountType;
  isDefault?: boolean;
}

export interface UpdateBankAccountDTO {
  accountHolderName?: string;
  bankName?: string;
  accountNumber?: string;
  routingNumber?: string;
  swiftCode?: string;
  accountType?: AccountType;
  isDefault?: boolean;
}

export interface BankAccountResponseDTO {
  id: string;
  accountHolderName: string;
  bankName: string;
  accountNumber: string;
  routingNumber: string;
  swiftCode: string;
  accountType: AccountType;
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
}