import mongoose, { Schema, Document } from 'mongoose';
import { OrderStatus, PaymentMethod, PaymentStatus } from '@quickcommerce/shared-types';

export interface IOrderItemSubdoc {
  productId: mongoose.Types.ObjectId;
  name: string;
  image: string;
  unit: string;
  quantity: number;
  price: number;
  discountPrice: number;
}

export interface IOrderTimelineSubdoc {
  status: OrderStatus;
  timestamp: Date;
  description: string;
}

export interface IOrderDocument extends Document {
  userId: mongoose.Types.ObjectId;
  storeId: mongoose.Types.ObjectId;
  items: IOrderItemSubdoc[];
  subtotal: number;
  discount: number;
  deliveryFee: number;
  tax: number;
  total: number;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  orderStatus: OrderStatus;
  idempotencyKey: string;
  deliveryAddress: {
    street: string;
    city: string;
    pincode: string;
    latitude?: number;
    longitude?: number;
  };
  timeline: IOrderTimelineSubdoc[];
  deliveryPartnerId?: mongoose.Types.ObjectId;
  deliveryPartnerName?: string;
  estimatedDeliveryMinutes?: number;
  createdAt: Date;
  updatedAt: Date;
}

const OrderItemSchema = new Schema(
  {
    productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    name: { type: String, required: true },
    image: { type: String, required: true },
    unit: { type: String, required: true },
    quantity: { type: Number, required: true, min: 1 },
    price: { type: Number, required: true },
    discountPrice: { type: Number, required: true },
  },
  { _id: false }
);

const OrderTimelineSchema = new Schema(
  {
    status: { type: String, required: true },
    timestamp: { type: Date, default: Date.now },
    description: { type: String, required: true },
  },
  { _id: false }
);

const OrderSchema = new Schema<IOrderDocument>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    storeId: { type: Schema.Types.ObjectId, ref: 'Store', required: true, index: true },
    items: [OrderItemSchema],
    subtotal: { type: Number, required: true, min: 0 },
    discount: { type: Number, default: 0, min: 0 },
    deliveryFee: { type: Number, default: 0, min: 0 },
    tax: { type: Number, default: 0, min: 0 },
    total: { type: Number, required: true, min: 0 },
    paymentMethod: {
      type: String,
      enum: ['COD', 'MOCK_ONLINE'],
      default: 'COD',
      required: true,
    },
    paymentStatus: {
      type: String,
      enum: ['PENDING', 'PAID', 'REFUNDED', 'FAILED'],
      default: 'PENDING',
      required: true,
    },
    orderStatus: {
      type: String,
      enum: [
        'ORDER_PLACED',
        'INVENTORY_RESERVED',
        'PREPARING_ORDER',
        'DELIVERY_PARTNER_ASSIGNED',
        'PICKED_UP',
        'OUT_FOR_DELIVERY',
        'DELIVERED',
        'CANCELLED',
        'FAILED',
        'REFUND_PENDING',
      ],
      default: 'ORDER_PLACED',
      required: true,
      index: true,
    },
    idempotencyKey: { type: String, required: true },
    deliveryAddress: {
      street: { type: String, required: true },
      city: { type: String, required: true },
      pincode: { type: String, required: true },
      latitude: { type: Number },
      longitude: { type: Number },
    },
    timeline: [OrderTimelineSchema],
    deliveryPartnerId: { type: Schema.Types.ObjectId, ref: 'User' },
    deliveryPartnerName: { type: String },
    estimatedDeliveryMinutes: { type: Number, default: 15 },
  },
  { timestamps: true }
);

// Indexes: Idempotency uniqueness, user order history, status filtering
OrderSchema.index({ userId: 1, idempotencyKey: 1 }, { unique: true });
OrderSchema.index({ userId: 1, createdAt: -1 });
OrderSchema.index({ orderStatus: 1, createdAt: -1 });
OrderSchema.index({ storeId: 1, createdAt: -1 });

export const OrderModel = mongoose.models.Order || mongoose.model<IOrderDocument>('Order', OrderSchema);
