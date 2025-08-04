const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const User = require('../src/models/user');
require('dotenv').config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/auto_spareparts';
const JWT_SECRET = process.env.JWT_SECRET || 'YOUR_JWT_SECRET';

async function main() {
  await mongoose.connect(MONGO_URI);
  const allSubadmins = await User.find({ role: 'subadmin' });
  console.log('All subadmins:');
  allSubadmins.forEach(u => {
    console.log(`ID: ${u._id}, approved: ${u.approved}, active: ${u.active}`);
  });
  const subadmin = await User.findOne({ role: 'subadmin', approved: true, active: true });
  if (!subadmin) {
    console.error('No approved and active subadmin found.');
    process.exit(1);
  }
  const payload = { id: subadmin._id, role: subadmin.role, approved: subadmin.approved, active: subadmin.active };
  const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
  console.log('Subadmin JWT Token:', token);
  mongoose.disconnect();
}

main();
