import { Schema, model, Document, Types } from 'mongoose';

interface ICartItem {
  productId: Types.ObjectId;
  variantId?: string; // Can be variant ID or color value for identification
  quantity: number;
  addedAt: Date;
}

interface ICart extends Document {
  user: Types.ObjectId;
  items: ICartItem[];
  createdAt: Date;
  updatedAt: Date;
}

const cartItemSchema = new Schema<ICartItem>({
  productId: {
    type: Schema.Types.ObjectId,
    ref: 'Product',
    required: true,
  },
  variantId: {
    type: String, // Simplified to string (can be ID or color)
    required: false,
  },
  quantity: {
    type: Number,
    required: true,
    min: 1,
  },
  addedAt: {
    type: Date,
    default: Date.now,
  },
});

const cartSchema = new Schema<ICart>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    items: [cartItemSchema],
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Method to find item by product and variant
cartSchema.methods.findItem = function(productId: string, variantId?: string) {
  return this.items.find((item: ICartItem) => 
    item.productId.toString() === productId && 
    (!variantId || item.variantId === variantId)
  );
};

// Method to clear cart
cartSchema.methods.clearCart = function() {
  this.items = [];
  return this.save();
};

const UserCartModel = model<ICart>('Cart', cartSchema);

export default UserCartModel;
export type { ICart, ICartItem };