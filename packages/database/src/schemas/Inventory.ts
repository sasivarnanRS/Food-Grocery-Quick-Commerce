import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IInventoryDocument extends Document {
  storeId: mongoose.Types.ObjectId;
  productId: mongoose.Types.ObjectId;
  availableQuantity: number;
  reservedQuantity: number;
  updatedAt: Date;
}

export interface IInventoryModel extends Model<IInventoryDocument> {
  atomicReserveStock(
    storeId: string | mongoose.Types.ObjectId,
    productId: string | mongoose.Types.ObjectId,
    quantity: number
  ): Promise<IInventoryDocument | null>;

  releaseReservedStock(
    storeId: string | mongoose.Types.ObjectId,
    productId: string | mongoose.Types.ObjectId,
    quantity: number
  ): Promise<IInventoryDocument | null>;

  fulfillReservedStock(
    storeId: string | mongoose.Types.ObjectId,
    productId: string | mongoose.Types.ObjectId,
    quantity: number
  ): Promise<IInventoryDocument | null>;
}

const InventorySchema = new Schema<IInventoryDocument>(
  {
    storeId: { type: Schema.Types.ObjectId, ref: 'Store', required: true, index: true },
    productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true, index: true },
    availableQuantity: { type: Number, required: true, min: 0 },
    reservedQuantity: { type: Number, default: 0, min: 0 },
  },
  { timestamps: { createdAt: false, updatedAt: true } }
);

// Compound Unique Index: each store has exactly one inventory document per product
InventorySchema.index({ storeId: 1, productId: 1 }, { unique: true });

// Atomic Inventory Reservation with Concurrency Control
InventorySchema.statics.atomicReserveStock = async function (
  storeId: string | mongoose.Types.ObjectId,
  productId: string | mongoose.Types.ObjectId,
  quantity: number
): Promise<IInventoryDocument | null> {
  const storeOid = typeof storeId === 'string' ? new mongoose.Types.ObjectId(storeId) : storeId;
  const productOid = typeof productId === 'string' ? new mongoose.Types.ObjectId(productId) : productId;

  return this.findOneAndUpdate(
    {
      storeId: storeOid,
      productId: productOid,
      availableQuantity: { $gte: quantity },
    },
    {
      $inc: { availableQuantity: -quantity, reservedQuantity: quantity },
      $set: { updatedAt: new Date() },
    },
    { new: true }
  );
};

// Release Reservation upon cancellation or processing failure (Compensation)
InventorySchema.statics.releaseReservedStock = async function (
  storeId: string | mongoose.Types.ObjectId,
  productId: string | mongoose.Types.ObjectId,
  quantity: number
): Promise<IInventoryDocument | null> {
  const storeOid = typeof storeId === 'string' ? new mongoose.Types.ObjectId(storeId) : storeId;
  const productOid = typeof productId === 'string' ? new mongoose.Types.ObjectId(productId) : productId;

  return this.findOneAndUpdate(
    {
      storeId: storeOid,
      productId: productOid,
      reservedQuantity: { $gte: quantity },
    },
    {
      $inc: { availableQuantity: quantity, reservedQuantity: -quantity },
      $set: { updatedAt: new Date() },
    },
    { new: true }
  );
};

// Fulfill Reservation upon delivery dispatch/completion
InventorySchema.statics.fulfillReservedStock = async function (
  storeId: string | mongoose.Types.ObjectId,
  productId: string | mongoose.Types.ObjectId,
  quantity: number
): Promise<IInventoryDocument | null> {
  const storeOid = typeof storeId === 'string' ? new mongoose.Types.ObjectId(storeId) : storeId;
  const productOid = typeof productId === 'string' ? new mongoose.Types.ObjectId(productId) : productId;

  return this.findOneAndUpdate(
    {
      storeId: storeOid,
      productId: productOid,
      reservedQuantity: { $gte: quantity },
    },
    {
      $inc: { reservedQuantity: -quantity },
      $set: { updatedAt: new Date() },
    },
    { new: true }
  );
};

export const InventoryModel =
  (mongoose.models.Inventory as IInventoryModel) ||
  mongoose.model<IInventoryDocument, IInventoryModel>('Inventory', InventorySchema);
