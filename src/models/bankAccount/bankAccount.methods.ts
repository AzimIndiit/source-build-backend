import { IBankAccount } from './bankAccount.types.js';
import BankAccount from './bankAccount.model.js';

export function getMaskedAccountNumber(this: IBankAccount): string {
  const accountNumber = this.accountNumber;
  if (accountNumber.length <= 4) {
    return accountNumber;
  }
  const lastFour = accountNumber.slice(-4);
  const masked = 'X'.repeat(accountNumber.length - 4);
  
  // Format as XXXX XXXX XXXX 1234
  const formatted = masked + lastFour;
  return formatted.replace(/(.{4})/g, '$1 ').trim();
}

export async function setAsDefault(this: IBankAccount): Promise<void> {
  // First, unset any existing default account for this user
  await BankAccount.updateMany(
    { user: this.user, _id: { $ne: this._id } },
    { $set: { isDefault: false } }
  );
  
  // Set this account as default
  this.isDefault = true;
  await this.save();
}

export async function softDelete(this: IBankAccount): Promise<void> {
  // If this is the default account, unset it
  if (this.isDefault) {
    this.isDefault = false;
  }
  
  this.isActive = false;
  await this.save();
}