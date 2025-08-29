import mongoose from 'mongoose';
import { addressSchema } from './address.schemas.js';
import { IAddressDocument, IAddressModel } from './address.types.js';

/**
 * Address model
 */
const Address = mongoose.model<IAddressDocument, IAddressModel>('Address', addressSchema);

export default Address;
