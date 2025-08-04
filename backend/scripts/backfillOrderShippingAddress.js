// Script to backfill missing shippingAddress in orders using buyer's address if available
// Usage: node backend/scripts/backfillOrderShippingAddress.js

const mongoose = require('mongoose');
const Order = require('../src/models/order');
const User = require('../src/models/user');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/auto_spareparts';

async function backfillShippingAddress() {
  await mongoose.connect(MONGO_URI);
  const orders = await Order.find({ $or: [ { shippingAddress: { $exists: false } }, { shippingAddress: '' } ] });
  let updated = 0;
  for (const order of orders) {
    if (!order.shippingAddress || order.shippingAddress === '') {
      const buyer = await User.findById(order.buyer);
      if (buyer && buyer.address) {
        order.shippingAddress = buyer.address;
        await order.save();
        updated++;
        console.log(`Order ${order._id} updated with shippingAddress from buyer.`);
      } else {
        console.warn(`Order ${order._id} could not be updated (no buyer address).`);
      }
    }
  }
  console.log(`\nBackfill complete. ${updated} orders updated.`);
  await mongoose.disconnect();
}

backfillShippingAddress().catch(err => {
  console.error('Backfill failed:', err);
  process.exit(1);
});
