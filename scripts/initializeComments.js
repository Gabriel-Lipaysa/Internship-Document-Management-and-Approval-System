require('dotenv').config();
const mongoose = require('mongoose');
const config = require('../config/config');
const { StudentProfile } = require('../models');

const initializeComments = async () => {
  try {
    await mongoose.connect(config.MONGODB_URI);
    console.log('Connected to MongoDB');

    const result = await StudentProfile.updateMany(
      { 'documents.comments': { $exists: false } },
      { 
        $set: { 
          'documents.$[].comments': [] 
        } 
      }
    );

    console.log(`Updated ${result.modifiedCount} student profiles`);
    console.log('Comments initialization complete');
    process.exit(0);
  } catch (error) {
    console.error('Error initializing comments:', error);
    process.exit(1);
  }
};

initializeComments();