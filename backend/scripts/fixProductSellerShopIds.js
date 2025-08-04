// scripts/fixProductSellerShopIds.js
// Run this script with: node scripts/fixProductSellerShopIds.js
// This will update all products to ensure they have sellerId and shopId set correctly.

const mongoose = require('mongoose');
const Product = require('../src/models/product');
const User = require('../src/models/user');
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/auto_spareparts';

async function main() {
  await mongoose.connect(MONGO_URI);
  const products = await Product.find({});
  let updated = 0;
  for (const product of products) {
    let changed = false;
    // Find the seller user (owner)
    const sellerUser = await User.findById(product.owner);
    if (!sellerUser) {
      console.warn(`Skipping product ${product._id}: owner user not found`);
      continue;
    }
    if (!sellerUser.sellerId) {
      console.warn(`Skipping product ${product._id}: seller user has no sellerId`);
      continue;
    }
    if (!product.sellerId || product.sellerId !== sellerUser.sellerId) {
      product.sellerId = sellerUser.sellerId;
      changed = true;
    }
    if (!product.shopId || String(product.shopId) !== String(sellerUser.shopId)) {
      product.shopId = sellerUser.shopId;
      changed = true;
    }
    if (changed) {
      await product.save();
      updated++;
      console.log(`Updated product ${product._id}: sellerId=${product.sellerId}, shopId=${product.shopId}`);
    }
  }
  console.log(`Done. Updated ${updated} products.`);
  await mongoose.disconnect();
}

main().catch(err => {
  console.error('Migration error:', err);
  process.exit(1);
});
