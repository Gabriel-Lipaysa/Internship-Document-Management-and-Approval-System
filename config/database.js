const mongoose = require('mongoose');
const config = require('./config');
const autoSeed = require('../utils/autoSeed');

let isConnecting = false;

const connectDB = async () => {
  if (isConnecting || mongoose.connection.readyState === 1) return;
  isConnecting = true;
  try {
    const options = {
      serverSelectionTimeoutMS: 15000,
      socketTimeoutMS: 45000,
    };
    await mongoose.connect(config.MONGODB_URI, options);
    console.log('✓ MongoDB connection successful');
    await autoSeed();
  } catch (err) {
    console.error('MongoDB connection error:', err.message);
    setTimeout(() => {
      isConnecting = false;
      connectDB();
    }, 5000);
    return;
  }
  isConnecting = false;
};

mongoose.connection.on('error', err => {
  console.error('MongoDB error:', err.message);
});

mongoose.connection.on('disconnected', () => {
  console.log('MongoDB disconnected');
});

module.exports = connectDB;
