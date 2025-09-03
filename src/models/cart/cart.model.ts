import { Schema, model, Document } from 'mongoose';

interface ICartItem {
  productId: Schema.Types.ObjectId;
  quantity: number;
  price: number;
}

interface ICart extends Document {
  user_id: Schema.Types.ObjectId;
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
  quantity: {
    type: Number,
    required: true,
    min: 1,
  },
  price: {
    type: Number,
    required: true,
    min: 0,
  },
});

const cartSchema = new Schema<ICart>(
  {
    user_id: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    items: [cartItemSchema],
  },
  {
    timestamps: true,
  }
);

const UserCartModel = model<ICart>('Cart', cartSchema);

export default UserCartModel;