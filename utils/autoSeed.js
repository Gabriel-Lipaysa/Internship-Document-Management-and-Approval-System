const bcrypt = require('bcryptjs');
const { User } = require('../models');

const defaultAccounts = [
  {
    email: 'director@example.com',
    password: 'director123',
    name: 'Director Admin',
    role: 'director',
    status: 'active',
    profilePicture: '/images/profile-placeholder.png'
  },
  {
    email: 'coordinator@example.com',
    password: 'coordinator123',
    name: 'OJT Coordinator',
    role: 'coordinator',
    campus: 'Main Campus',
    status: 'active',
    profilePicture: '/images/profile-placeholder.png'
  }
];

const autoSeed = async () => {
  try {
    for (const account of defaultAccounts) {
      const exists = await User.findOne({ email: account.email });
      if (!exists) {
        const hashedPassword = await bcrypt.hash(account.password, 10);
        await User.create({
          ...account,
          password: hashedPassword
        });
        console.log(`✓ [AutoSeed] Created ${account.role} account (${account.email})`);
      }
    }
  } catch (error) {
    console.error('[AutoSeed] Error verifying default accounts:', error.message);
  }
};

module.exports = autoSeed;

