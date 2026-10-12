import mongoose, { Schema, Document } from 'mongoose';

export interface ICategoryDocument extends Document {
  name: string;
  slug: string;
  image: string;
  active: boolean;
  createdAt: Date;
}

const CategorySchema = new Schema<ICategoryDocument>(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    image: { type: String, required: true },
    active: { type: Boolean, default: true, index: true },
  },
  { timestamps: true }
);

export const CategoryModel =
  mongoose.models.Category || mongoose.model<ICategoryDocument>('Category', CategorySchema);
