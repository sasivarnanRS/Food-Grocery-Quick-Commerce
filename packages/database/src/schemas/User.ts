import mongoose, { Schema, Document } from 'mongoose';
import { UserRole } from '@quickcommerce/shared-types';

export interface IUserDocument extends Document {
  name: string;
  email: string;
  passwordHash: string;
  phone?: string;
  role: UserRole;
  createdAt: Date;
}

const UserSchema = new Schema<IUserDocument>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    passwordHash: { type: String, required: true },
    phone: { type: String, trim: true },
    role: {
      type: String,
      enum: ['CUSTOMER', 'ADMIN', 'DELIVERY_PARTNER'],
      default: 'CUSTOMER',
      required: true,
      index: true,
    },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export const UserModel = mongoose.models.User || mongoose.model<IUserDocument>('User', UserSchema);
