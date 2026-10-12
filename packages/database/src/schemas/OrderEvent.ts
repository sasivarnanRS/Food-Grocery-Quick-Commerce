import mongoose, { Schema, Document } from 'mongoose';

export interface IOrderEventDocument extends Document {
  orderId: mongoose.Types.ObjectId;
  eventType: string;
  eventData: Record<string, unknown>;
  service: string;
  createdAt: Date;
}

const OrderEventSchema = new Schema<IOrderEventDocument>(
  {
    orderId: { type: Schema.Types.ObjectId, ref: 'Order', required: true, index: true },
    eventType: { type: String, required: true, index: true },
    eventData: { type: Schema.Types.Mixed, required: true },
    service: { type: String, required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

OrderEventSchema.index({ orderId: 1, createdAt: -1 });
OrderEventSchema.index({ eventType: 1, createdAt: -1 });

export const OrderEventModel =
  mongoose.models.OrderEvent || mongoose.model<IOrderEventDocument>('OrderEvent', OrderEventSchema);
