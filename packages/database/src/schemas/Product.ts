import mongoose, { Schema, Document } from 'mongoose';

export interface IProductDocument extends Document {
  name: string;
  description: string;
  categoryId: mongoose.Types.ObjectId;
  image: string;
  price: number;
  discount: number;
  unit: string;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const ProductSchema = new Schema<IProductDocument>(
  {
    name: { type: String, required: true, trim: true, index: true },
    description: { type: String, required: true },
    categoryId: { type: Schema.Types.ObjectId, ref: 'Category', required: true, index: true },
    image: { type: String, required: true },
    price: { type: Number, required: true, min: 0 },
    discount: { type: Number, default: 0, min: 0, max: 100 },
    unit: { type: String, required: true, trim: true },
    active: { type: Boolean, default: true, index: true },
  },
  { timestamps: true }
);

// Indexes for high-throughput searching and category filtering
ProductSchema.index({ name: 'text', description: 'text' });
ProductSchema.index({ categoryId: 1, active: 1 });
ProductSchema.index({ price: 1 });

export const ProductModel =
  mongoose.models.Product || mongoose.model<IProductDocument>('Product', ProductSchema);
