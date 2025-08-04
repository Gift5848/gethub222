// Script to check for missing location/address in ShopRequest and phone/address in User
// Usage: node backend/scripts/checkMissingShopAndUserFields.js

const mongoose = require('mongoose');
const ShopRequest = require('../src/models/shopRequest');
const User = require('../src/models/user');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/auto_spareparts';

async function checkMissingFields() {
  await mongoose.connect(MONGO_URI);
  const shops = await ShopRequest.find({});
  let missingShop = 0;
  for (const shop of shops) {
    if (!shop.location || !shop.address) {
      missingShop++;
      console.log(`ShopRequest ${shop._id} missing location or address. Name: ${shop.shopName}`);
    }
  }
  const users = await User.find({});
  let missingUser = 0;
  for (const user of users) {
    if (!user.phone || !user.address) {
      missingUser++;
      console.log(`User ${user._id} missing phone or address. Username: ${user.username}`);
    }
  }
  console.log(`\nCheck complete. Shops missing fields: ${missingShop}, Users missing fields: ${missingUser}`);
  await mongoose.disconnect();
}

checkMissingFields().catch(err => {
  console.error('Check failed:', err);
  process.exit(1);
});
