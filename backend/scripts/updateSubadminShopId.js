// Script to update subadmin user with correct shopId
const mongoose = require('mongoose');
const User = require('../src/models/user');
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/auto_spareparts';

// Replace these with your actual subadmin and shop ObjectIds
const SUBADMIN_ID = '6880dffab80cc1550480612c';
const SHOP_ID = '6880dffab80cc1550480612a';

async function main() {
  await mongoose.connect(MONGO_URI);
  const user = await User.findById(SUBADMIN_ID);
  if (!user) {
    console.log('Subadmin not found');
    return;
  }
  user.shopId = SHOP_ID;
  await user.save();
  console.log('Subadmin updated:', user);
  await mongoose.disconnect();
}

main().catch(console.error);
