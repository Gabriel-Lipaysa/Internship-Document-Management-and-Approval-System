require('dotenv').config();
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const config = require('../config/config');
const { User, StudentProfile, Announcement, Comment } = require('../models');

const resetDatabase = async () => {
  try {
    await mongoose.connect(config.MONGODB_URI);
    console.log('Connected to MongoDB');

    await Promise.all([
      User.deleteMany({}),
      StudentProfile.deleteMany({}),
      Announcement.deleteMany({}),
      Comment.deleteMany({})
    ]);
    console.log('Deleted all documents from User, StudentProfile, Announcement, and Comment collections');

    const uploadsDir = path.join(__dirname, '..', config.UPLOAD_DIR);
    if (fs.existsSync(uploadsDir)) {
      const cleanDirectory = (dir) => {
        fs.readdirSync(dir).forEach(file => {
          const fullPath = path.join(dir, file);
          if (fs.statSync(fullPath).isDirectory()) {
            cleanDirectory(fullPath);
          } else if (file !== '.gitkeep') {
            fs.unlinkSync(fullPath);
          }
        });
      };
      cleanDirectory(uploadsDir);
      console.log('Cleared uploads directory');
    }

    console.log('Database reset complete');
    process.exit(0);
  } catch (error) {
    console.error('Error resetting database:', error);
    process.exit(1);
  }
};

resetDatabase();
