const mongoose = require('mongoose');
const config = require('./config');

let isConnecting = false;

const connectDB = async () => {
  if (isConnecting || mongoose.connection.readyState === 1) return;
  isConnecting = true;
  try {
    await mongoose.connect(config.MONGODB_URI);
    console.log('\nDatabase connection successful');
    console.log('MongoDB connection successful');
  } catch (err) {
    console.error('\nDatabase connection error:', err.message);
    setTimeout(connectDB, 5000);
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
  console.error('\nMongoDB error:', err);
  console.error('MongoDB error:', err.message);
});

mongoose.connection.on('disconnected', () => {
  console.log('\nMongoDB disconnected - reconnecting...');
  connectDB();
  console.log('MongoDB disconnected');
});

module.exports = connectDB;
