const mongoose = require('mongoose');
const User = require('../src/models/user');
require('dotenv').config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/auto_spareparts';
const SHOP_ID = process.argv[2] || 'YOUR_SHOP_ID_HERE';

async function main() {
  await mongoose.connect(MONGO_URI);
  const subadmin = await User.findOne({ role: 'subadmin' });
  if (!subadmin) {
    console.error('No subadmin user found.');
    process.exit(1);
  }
  subadmin.shopId = SHOP_ID;
  await subadmin.save();
  console.log(`Subadmin ${subadmin._id} shopId set to: ${SHOP_ID}`);
  mongoose.disconnect();
}

main();
