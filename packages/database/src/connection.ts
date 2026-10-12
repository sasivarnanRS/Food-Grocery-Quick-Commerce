import mongoose from 'mongoose';

export interface DbStatus {
  isConnected: boolean;
  readyState: number;
  host?: string;
  name?: string;
}

export const connectDatabase = async (uri?: string): Promise<typeof mongoose> => {
  const mongoUri = uri || process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/quickcommerce';
  
  if (mongoose.connection.readyState === 1) {
    return mongoose;
  }

  try {
    await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 5000,
    });
    return mongoose;
  } catch (error) {
    console.error('Failed to connect to MongoDB at', mongoUri, error);
    throw error;
  }
};

export const getDbStatus = (): DbStatus => {
  return {
    isConnected: mongoose.connection.readyState === 1,
    readyState: mongoose.connection.readyState,
    host: mongoose.connection.host,
    name: mongoose.connection.name,
  };
};

export const disconnectDatabase = async (): Promise<void> => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
};
