// Script to set buyerId for all users with role 'user' if missing
const mongoose = require('mongoose');
const User = require('../src/models/user');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/auto_spareparts';

async function main() {
  await mongoose.connect(MONGO_URI);
  console.log('Connected to MongoDB');

  const users = await User.find({ role: 'user', $or: [ { buyerId: { $exists: false } }, { buyerId: null } ] });
  let updated = 0;
  for (const user of users) {
    // Generate a unique buyerId (e.g., bu1, bu2, ...)
    user.buyerId = 'bu' + user._id.toString().slice(-6); // Simple unique buyerId
    await user.save();
    updated++;
    console.log(`Set buyerId for user ${user._id}: ${user.buyerId}`);
  }
  console.log(`Done. Updated ${updated} users.`);
  await mongoose.disconnect();
}

main().catch(err => { console.error(err); process.exit(1); });
