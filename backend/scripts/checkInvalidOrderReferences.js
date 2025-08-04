// Script to check for orders with invalid shopId or buyer references
// Usage: node backend/scripts/checkInvalidOrderReferences.js

const mongoose = require('mongoose');
const Order = require('../src/models/order');
const ShopRequest = require('../src/models/shopRequest');
const User = require('../src/models/user');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/auto_spareparts';

async function checkInvalidOrders() {
  await mongoose.connect(MONGO_URI);
  const orders = await Order.find({});
  let invalidShop = 0, invalidBuyer = 0;
  for (const order of orders) {
    let shopOk = true, buyerOk = true;
    if (!order.shopId || !(await ShopRequest.findById(order.shopId))) {
      shopOk = false;
      invalidShop++;
      console.log(`Order ${order._id} has invalid shopId: ${order.shopId}`);
    }
    if (!order.buyer || !(await User.findById(order.buyer))) {
      buyerOk = false;
      invalidBuyer++;
      console.log(`Order ${order._id} has invalid buyer: ${order.buyer}`);
    }
    if (shopOk && buyerOk) {
      // Optionally, print valid orders
      // console.log(`Order ${order._id} is valid.`);
    }
  }
  console.log(`\nCheck complete. Orders with invalid shopId: ${invalidShop}, invalid buyer: ${invalidBuyer}`);
  await mongoose.disconnect();
}

checkInvalidOrders().catch(err => {
  console.error('Check failed:', err);
  process.exit(1);
});
