import { IProduct, DiscountType } from './product.types.js';

export function calculateDiscountedPrice(this: IProduct): number {
  if (!this.discount || this.discount.discountType === DiscountType.NONE) {
    return this.price;
  }

  const { discountType, discountValue } = this.discount;
  
  if (!discountValue) {
    return this.price;
  }

  if (discountType === DiscountType.FLAT) {
    return Math.max(0, this.price - discountValue);
  }

  if (discountType === DiscountType.PERCENTAGE) {
    const discountAmount = (this.price * discountValue) / 100;
    return Math.max(0, this.price - discountAmount);
  }

  return this.price;
}

export function calculateVariantPrice(this: IProduct, variantIndex: number): number {
  if (!this.variants || !this.variants[variantIndex]) {
    throw new Error('Variant not found');
  }

  const variant = this.variants[variantIndex];
  
  if (!variant.discount || variant.discount.discountType === DiscountType.NONE) {
    return variant.price;
  }

  const { discountType, discountValue } = variant.discount;
  
  if (!discountValue) {
    return variant.price;
  }

  if (discountType === DiscountType.FLAT) {
    return Math.max(0, variant.price - discountValue);
  }

  if (discountType === DiscountType.PERCENTAGE) {
    const discountAmount = (variant.price * discountValue) / 100;
    return Math.max(0, variant.price - discountAmount);
  }

  return variant.price;
}

export function isAvailable(this: IProduct): boolean {
  if (this.status !== 'active') {
    return false;
  }

  if (this.quantity <= 0) {
    return false;
  }

  if (this.variants && this.variants.length > 0) {
    return this.variants.some(variant => variant.quantity > 0);
  }

  return true;
}

export async function incrementView(this: IProduct): Promise<void> {
  this.views = (this.views || 0) + 1;
  await this.save();
}

export async function incrementLike(this: IProduct): Promise<void> {
  this.likes = (this.likes || 0) + 1;
  await this.save();
}

export async function decrementQuantity(this: IProduct, amount: number): Promise<void> {
  if (this.quantity < amount) {
    throw new Error('Insufficient stock');
  }
  
  this.quantity -= amount;
  
  if (this.quantity === 0) {
    this.status = 'out_of_stock' as any;
  }
  
  await this.save();
}