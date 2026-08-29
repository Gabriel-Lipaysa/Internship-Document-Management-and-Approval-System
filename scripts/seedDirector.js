const mongoose = require('mongoose');
require('dotenv').config();
const bcrypt = require('bcryptjs');
const { User } = require('../models');
const config = require('../config/config');

async function seedDirector() {
  try {
    await mongoose.connect(config.MONGODB_URI);

    const directorData = {
      email: 'director@example.com',
      password: 'director123',
      name: 'Director Admin',
      role: 'director',
      status: 'active',
      profilePicture: '/images/profile-placeholder.png'
    };

    const exists = await User.findOne({ email: directorData.email });
    if (exists) {
      console.log('Director account already exists');
      process.exit(0);
    }

    const hashedPassword = await bcrypt.hash(directorData.password, 10);
    const director = await User.create({
      ...directorData,
      password: hashedPassword
    });

    console.log('Director account created successfully:');
    console.log('Email:', directorData.email);
    console.log('Password:', directorData.password);

    process.exit(0);
  } catch (err) {
    console.error('Error seeding director:', err);
    process.exit(1);
  }
}

seedDirector();
