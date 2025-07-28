// Script to convert all product.shopId fields to ObjectId type
const mongoose = require('mongoose');
const Product = require('../src/models/product');
const ShopRequest = require('../src/models/shopRequest');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/yourdbname';

async function main() {
  await mongoose.connect(MONGO_URI);
  console.log('Connected to MongoDB');

  const products = await Product.find({});
  let updated = 0;
  for (const product of products) {
    if (product.shopId && typeof product.shopId === 'string') {
      // Check if this string is a valid ShopRequest ObjectId
      const shop = await ShopRequest.findById(product.shopId);
      if (shop) {
        product.shopId = mongoose.Types.ObjectId(product.shopId);
        await product.save();
        updated++;
        console.log(`Converted shopId for product ${product._id} to ObjectId (${product.shopId})`);
      } else {
        console.log(`shopId ${product.shopId} for product ${product._id} is not a valid ShopRequest`);
      }
    }
  }
  console.log(`Done. Converted ${updated} products.`);
  await mongoose.disconnect();
}

main().catch(err => { console.error(err); process.exit(1); });
