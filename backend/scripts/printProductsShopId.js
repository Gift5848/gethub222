// Script to print products and their shopId field
const mongoose = require('mongoose');
const Product = require('../src/models/product');
const ShopRequest = require('../src/models/shopRequest');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/auto_spareparts';

async function main() {
  await mongoose.connect(MONGO_URI);
  console.log('Connected to MongoDB');

  const products = await Product.find({});
  if (!products.length) {
    console.log('No products found.');
  }
  for (const product of products) {
    let shop = null;
    let shopError = null;
    if (product.shopId) {
      try {
        shop = await ShopRequest.findById(product.shopId);
      } catch (e) {
        shopError = e.message;
      }
    }
    console.log({
      productId: product._id,
      name: product.name,
      shopId: product.shopId,
      shopIdType: typeof product.shopId,
      shopName: shop ? shop.shopName : null,
      shopError,
    });
  }
  await mongoose.disconnect();
}

main().catch(err => { console.error(err); process.exit(1); });
