// Script to batch update users missing phone or address with placeholder values
// Usage: node backend/scripts/fixMissingUserFields.js

const mongoose = require('mongoose');
const User = require('../src/models/user');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/auto_spareparts';

async function fixUsers() {
  await mongoose.connect(MONGO_URI);
  const users = await User.find({ $or: [ { phone: { $exists: false } }, { phone: '' }, { address: { $exists: false } }, { address: '' } ] });
  let updated = 0;
  for (const user of users) {
    if (!user.phone || user.phone === '') user.phone = '000-000-0000';
    if (!user.address || user.address === '') user.address = 'Unknown Address';
    await user.save();
    updated++;
    console.log(`User ${user._id} (${user.username}) updated.`);
  }
  console.log(`\nUpdate complete. ${updated} users updated.`);
  await mongoose.disconnect();
}

fixUsers().catch(err => {
  console.error('Update failed:', err);
  process.exit(1);
});
