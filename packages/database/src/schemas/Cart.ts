import mongoose, { Schema, Document } from 'mongoose';

export interface ICartItemSubdocument {
  productId: mongoose.Types.ObjectId;
  storeId: mongoose.Types.ObjectId;
  quantity: number;
}

export interface ICartDocument extends Document {
  userId: mongoose.Types.ObjectId;
  items: ICartItemSubdocument[];
  updatedAt: Date;
}

const CartItemSchema = new Schema(
  {
    productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    storeId: { type: Schema.Types.ObjectId, ref: 'Store', required: true },
    quantity: { type: Number, required: true, min: 1 },
  },
  { _id: false }
);

const CartSchema = new Schema<ICartDocument>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true, index: true },
    items: [CartItemSchema],
  },
  { timestamps: { createdAt: false, updatedAt: true } }
);

export const CartModel = mongoose.models.Cart || mongoose.model<ICartDocument>('Cart', CartSchema);
