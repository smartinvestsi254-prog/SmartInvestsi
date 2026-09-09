import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/smartinvest';

let isConnected = false;

export async function connectMongoDB() {
  if (isConnected) {
    return mongoose.connection;
  }

  try {
    await mongoose.connect(MONGODB_URI);
    isConnected = true;
    console.log('✓ MongoDB connected');
    return mongoose.connection;
  } catch (error) {
    console.error('✗ MongoDB connection failed:', error);
    throw error;
  }
}

export function getMongoDBConnection() {
  return mongoose.connection;
}

export default mongoose;
