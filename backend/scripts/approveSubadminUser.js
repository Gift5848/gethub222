// Usage: node scripts/approveSubadminUser.js <subadmin_email>
const mongoose = require('mongoose');
const User = require('../models/user');
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/auto_sparepartsnode scripts/approveSubadminUser.js <subadmin_email>node scripts/approveSubadminUser.js <subadmin_email>node scripts/approveSubadminUser.js <subadmin_email>node scripts/approveSubadminUser.js <subadmin_email>node scripts/approveSubadminUser.js <subadmin_email>node scripts/approveSubadminUser.js <subadmin_email>';

async function approveSubadmin(email) {
  await mongoose.connect(MONGO_URI);
  const user = await User.findOne({ email, role: 'subadmin' });
  if (!user) {
    console.log('Subadmin not found');
    process.exit(1);
  }
  user.active = true;
  user.approved = true;
  await user.save();
  console.log(`Subadmin ${email} is now active and approved.`);
  mongoose.disconnect();
}

const email = process.argv[2];
if (!email) {
  console.log('Usage: node scripts/approveSubadminUser.js <subadmin_email>');
  process.exit(1);
}
approveSubadmin(email);
