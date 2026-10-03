import mongoose from 'mongoose';

let memoryServer = null;

export const connectDB = async () => {
  const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/blood_donation_db';

  try {
    mongoose.set('strictQuery', false);
    await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 3000,
    });
    console.log(`[Database] MongoDB connected successfully to: ${mongoose.connection.host}/${mongoose.connection.name}`);
  } catch (error) {
    console.warn(`[Database] Primary MongoDB connection failed (${error.message}).`);
    
    // In development or test, fall back to mongodb-memory-server if primary mongod is unavailable
    if (process.env.NODE_ENV !== 'production') {
      try {
        console.log('[Database] Starting in-memory MongoDB server fallback for local development...');
        const { MongoMemoryServer } = await import('mongodb-memory-server');
        memoryServer = await MongoMemoryServer.create({
          instance: {
            dbName: 'blood_donation_db',
          },
        });
        const uri = memoryServer.getUri();
        await mongoose.connect(uri);
        console.log(`[Database] In-memory MongoDB connected at: ${uri}`);
      } catch (memErr) {
        console.error('[Database] In-memory MongoDB fallback failed:', memErr.message);
        throw memErr;
      }
    } else {
      throw error;
    }
  }
};

export const closeDB = async () => {
  await mongoose.connection.close();
  if (memoryServer) {
    await memoryServer.stop();
  }
};
