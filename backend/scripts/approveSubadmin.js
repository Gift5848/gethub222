const mongoose = require('mongoose');
const User = require('../src/models/user');
require('dotenv').config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/auto_spareparts';

async function main() {
  await mongoose.connect(MONGO_URI);
  const subadmin = await User.findOne({ role: 'subadmin' });
  if (!subadmin) {
    console.error('No subadmin user found.');
    process.exit(1);
  }
  subadmin.approved = true;
  subadmin.active = true;
  await subadmin.save();
  console.log('Subadmin approved and activated:', subadmin._id);
  mongoose.disconnect();
}

main();
