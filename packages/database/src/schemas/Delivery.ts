import mongoose, { Schema, Document } from 'mongoose';
import { DeliveryStatus } from '@quickcommerce/shared-types';

export interface IDeliveryDocument extends Document {
  orderId: mongoose.Types.ObjectId;
  partnerId?: mongoose.Types.ObjectId;
  partnerName?: string;
  partnerPhone?: string;
  status: DeliveryStatus;
  estimatedDeliveryMinutes: number;
  assignedAt?: Date;
  deliveredAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const DeliverySchema = new Schema<IDeliveryDocument>(
  {
    orderId: { type: Schema.Types.ObjectId, ref: 'Order', required: true, unique: true, index: true },
    partnerId: { type: Schema.Types.ObjectId, ref: 'User', index: true },
    partnerName: { type: String },
    partnerPhone: { type: String },
    status: {
      type: String,
      enum: ['PENDING', 'ASSIGNED', 'ACCEPTED', 'PICKED_UP', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED'],
      default: 'PENDING',
      required: true,
      index: true,
    },
    estimatedDeliveryMinutes: { type: Number, default: 15 },
    assignedAt: { type: Date },
    deliveredAt: { type: Date },
  },
  { timestamps: true }
);

DeliverySchema.index({ partnerId: 1, status: 1 });

export const DeliveryModel =
  mongoose.models.Delivery || mongoose.model<IDeliveryDocument>('Delivery', DeliverySchema);
