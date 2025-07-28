// Script to update a user's role to admin or subadmin
const mongoose = require('mongoose');
const User = require('../src/models/user');
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/auto_spareparts';

// Replace with your actual user email and desired role
const USER_EMAIL = 'admin@example.com'; // Change to your target user
const NEW_ROLE = 'admin'; // Use 'admin' or 'subadmin'

async function main() {
  await mongoose.connect(MONGO_URI);
  const user = await User.findOne({ email: USER_EMAIL });
  if (!user) {
    console.log('User not found');
    return;
  }
  user.role = NEW_ROLE;
  user.active = true;
  user.approved = true;
  // Find an existing shop's ObjectId
  const shopRequest = await require('../src/models/shopRequest').findOne({ status: 'approved' });
  if (shopRequest && shopRequest._id) {
    user.shopId = shopRequest._id;
    console.log('Assigned shopId:', shopRequest._id.toString());
  } else {
    console.log('No approved shop found. shopId not set.');
  }
  await user.save();
  console.log('User updated:', user);
  await mongoose.disconnect();
}

main().catch(console.error);
