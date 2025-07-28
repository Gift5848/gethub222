// Script to print the most recent products and their owner/shopId
const mongoose = require('mongoose');
const Product = require('../src/models/product');
const User = require('../src/models/user');
const ShopRequest = require('../src/models/shopRequest');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/auto_spareparts';

async function main() {
  await mongoose.connect(MONGO_URI);
  console.log('Connected to MongoDB');

  const products = await Product.find({}).sort({ createdAt: -1 }).limit(5);
  if (!products.length) {
    console.log('No products found.');
  }
  for (const product of products) {
    let owner = null;
    let shop = null;
    let ownerError = null;
    let shopError = null;
    if (product.owner) {
      try {
        owner = await User.findById(product.owner);
      } catch (e) { ownerError = e.message; }
    }
    if (product.shopId) {
      try {
        shop = await ShopRequest.findById(product.shopId);
      } catch (e) { shopError = e.message; }
    }
    console.log({
      productId: product._id,
      name: product.name,
      owner: owner ? owner.username : product.owner,
      ownerShopId: owner ? owner.shopId : null,
      productShopId: product.shopId,
      shopName: shop ? shop.shopName : null,
      ownerError,
      shopError
    });
  }
  await mongoose.disconnect();
}

main().catch(err => { console.error(err); process.exit(1); });
