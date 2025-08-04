// Script to migrate order.shopId from string to ObjectId reference
// Usage: node backend/scripts/migrateOrderShopIdToObjectId.js

const mongoose = require('mongoose');
const Order = require('../src/models/order');
const ShopRequest = require('../src/models/shopRequest');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/auto_spareparts';

async function migrate() {
  await mongoose.connect(MONGO_URI);
  const orders = await Order.find({});
  let updated = 0;
  for (const order of orders) {
    if (order.shopId && typeof order.shopId === 'string' && order.shopId.length > 10) {
      // Try to find shop by string id (shopId field in ShopRequest)
      const shop = await ShopRequest.findOne({ _id: order.shopId }) || await ShopRequest.findOne({ shopName: order.shopId });
      if (shop) {
        order.shopId = shop._id;
        await order.save();
        updated++;
        console.log(`Order ${order._id} updated to shopId ObjectId ${shop._id}`);
      } else {
        console.warn(`Order ${order._id} has invalid shopId: ${order.shopId}`);
      }
    }
  }
  console.log(`Migration complete. Updated ${updated} orders.`);
  await mongoose.disconnect();
}

migrate().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
