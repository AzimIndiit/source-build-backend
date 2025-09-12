import { IWishlist } from './wishlist.types.js';

export async function addItem(this: IWishlist, productId: string, notificationEnabled: boolean = false): Promise<void> {
  const existingItem = this.items.find(item => item.product.toString() === productId);
  
  if (!existingItem) {
    this.items.push({
      product: productId as any,
      addedAt: new Date(),
      notificationEnabled,
    });
    await this.save();
  }
}

export async function removeItem(this: IWishlist, productId: string): Promise<void> {
  this.items = this.items.filter(item => item.product.toString() !== productId);
  await this.save();
}

export function hasProduct(this: IWishlist, productId: string): boolean {
  return this.items.some(item => item.product.toString() === productId);
}

export async function clearWishlist(this: IWishlist): Promise<void> {
  this.items = [];
  await this.save();
}

export async function setPriceAlert(this: IWishlist, productId: string, targetPrice: number): Promise<void> {
  const item = this.items.find(item => item.product.toString() === productId);
  
  if (item) {
    item.priceAlert = {
      targetPrice,
      alertEnabled: true,
    };
    await this.save();
  }
}

export async function removePriceAlert(this: IWishlist, productId: string): Promise<void> {
  const item = this.items.find(item => item.product.toString() === productId);
  
  if (item) {
    item.priceAlert = undefined;
    await this.save();
  }
}