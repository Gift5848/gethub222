// Script to print all users and products with their shopId
const mongoose = require('mongoose');
const User = require('../src/models/user');
const Product = require('../src/models/product');
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/auto_spareparts';

async function main() {
  await mongoose.connect(MONGO_URI);
  const users = await User.find({}, 'username role shopId');
  const products = await Product.find({}, 'name shopId owner');
  console.log('Users:');
  users.forEach(u => console.log(u));
  console.log('\nProducts:');
  products.forEach(p => console.log(p));
  await mongoose.disconnect();
}

main().catch(console.error);
