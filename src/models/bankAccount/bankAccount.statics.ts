import { Types } from 'mongoose';
import { IBankAccount, IBankAccountModel } from './bankAccount.types.js';

export async function findUserAccounts(
  this: IBankAccountModel,
  userId: Types.ObjectId
): Promise<IBankAccount[]> {
  return this.find({ user: userId, isActive: true }).sort({ isDefault: -1, createdAt: -1 });
}

export async function findDefaultAccount(
  this: IBankAccountModel,
  userId: Types.ObjectId
): Promise<IBankAccount | null> {
  return this.findOne({ user: userId, isDefault: true, isActive: true });
}

export async function setDefaultAccount(
  this: IBankAccountModel,
  userId: Types.ObjectId,
  accountId: Types.ObjectId
): Promise<void> {
  // First, unset any existing default account
  await this.updateMany(
    { user: userId },
    { $set: { isDefault: false } }
  );
  
  // Set the specified account as default
  await this.updateOne(
    { _id: accountId, user: userId },
    { $set: { isDefault: true } }
  );
}

export async function findByIdAndUser(
  this: IBankAccountModel,
  accountId: Types.ObjectId,
  userId: Types.ObjectId
): Promise<IBankAccount | null> {
  return this.findOne({ _id: accountId, user: userId, isActive: true });
}