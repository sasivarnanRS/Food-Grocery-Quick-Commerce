import mongoose, { Schema, Document } from 'mongoose';

export interface IStoreDocument extends Document {
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  location: {
    type: string;
    coordinates: [number, number]; // [longitude, latitude]
  };
  active: boolean;
  createdAt: Date;
}

const StoreSchema = new Schema<IStoreDocument>(
  {
    name: { type: String, required: true, trim: true },
    address: { type: String, required: true },
    latitude: { type: Number, required: true },
    longitude: { type: Number, required: true },
    location: {
      type: { type: String, enum: ['Point'], default: 'Point' },
      coordinates: { type: [Number], required: true },
    },
    active: { type: Boolean, default: true, index: true },
  },
  { timestamps: true }
);

// 2dsphere index for nearby store geospatial queries
StoreSchema.index({ location: '2dsphere' });
StoreSchema.index({ latitude: 1, longitude: 1 });

export const StoreModel = mongoose.models.Store || mongoose.model<IStoreDocument>('Store', StoreSchema);
