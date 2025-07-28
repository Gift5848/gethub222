// Script to fix product.shopId to be ObjectId reference to ShopRequest
const mongoose = require('mongoose');
const Product = require('../src/models/product');
const User = require('../src/models/user');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/auto_spareparts';

async function main() {
  await mongoose.connect(MONGO_URI);
  console.log('Connected to MongoDB');

  const products = await Product.find({});
  let updated = 0;
  for (const product of products) {
    if (!product.shopId || product.shopId === '' || product.shopId === null || typeof product.shopId === 'undefined') {
      const seller = await User.findById(product.owner);
      if (seller && seller.shopId) {
        product.shopId = seller.shopId;
        await product.save();
        updated++;
        console.log(`Updated product ${product._id} with shopId ${seller.shopId}`);
      } else {
        console.log(`No shopId found for seller ${product.owner} (product ${product._id})`);
      }
    }
  }
  console.log(`Done. Updated ${updated} products.`);
  await mongoose.disconnect();
}

main().catch(err => { console.error(err); process.exit(1); });
