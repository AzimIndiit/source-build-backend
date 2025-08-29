import { model } from 'mongoose';
import { IBankAccount, IBankAccountModel, IBankAccountMethods } from './bankAccount.types.js';
import { BankAccountSchema } from './bankAccount.schemas.js';
import * as bankAccountMethods from './bankAccount.methods.js';
import * as bankAccountStatics from './bankAccount.statics.js';

// Attach methods
BankAccountSchema.methods.getMaskedAccountNumber = bankAccountMethods.getMaskedAccountNumber;
BankAccountSchema.methods.setAsDefault = bankAccountMethods.setAsDefault;
BankAccountSchema.methods.softDelete = bankAccountMethods.softDelete;

// Attach statics
BankAccountSchema.statics['findUserAccounts'] = bankAccountStatics.findUserAccounts;
BankAccountSchema.statics['findDefaultAccount'] = bankAccountStatics.findDefaultAccount;
BankAccountSchema.statics['setDefaultAccount'] = bankAccountStatics.setDefaultAccount;
BankAccountSchema.statics['findByIdAndUser'] = bankAccountStatics.findByIdAndUser;

const BankAccountModal = model<IBankAccount, IBankAccountModel>('BankAccount', BankAccountSchema);

export default BankAccountModal;