require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { User } = require('../models');
const config = require('../config/config');

const seedCoordinator = async () => {
  try {
    await mongoose.connect(config.MONGODB_URI);

    const coordinatorData = {
      email: 'coordinator@example.com',
      password: 'coordinator123',
      name: 'OJT Coordinator',
      role: 'coordinator',
      campus: 'Main Campus',
      status: 'active',
      profilePicture: '/images/profile-placeholder.png'
    };

    const exists = await User.findOne({ email: coordinatorData.email });
    if (exists) {
      console.log('Coordinator account already exists');
      process.exit(0);
    }

    const hashedPassword = await bcrypt.hash(coordinatorData.password, 10);
    const coordinator = await User.create({
      ...coordinatorData,
      password: hashedPassword
    });

    console.log('Coordinator account created successfully:');
    console.log('Email:', coordinatorData.email);
    console.log('Password:', coordinatorData.password);

    process.exit(0);
  } catch (error) {
    console.error('Error seeding coordinator:', error);
    process.exit(1);
  }
};

seedCoordinator();
