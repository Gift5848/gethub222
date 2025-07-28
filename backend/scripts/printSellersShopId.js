// Script to print all sellers and their shopId
const mongoose = require('mongoose');
const User = require('../src/models/user');
const ShopRequest = require('../src/models/shopRequest');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/auto_spareparts';

async function main() {
  await mongoose.connect(MONGO_URI);
  console.log('Connected to MongoDB');

  const sellers = await User.find({ role: 'seller' });
  for (const seller of sellers) {
    let shop = null;
    if (seller.shopId) {
      try {
        shop = await ShopRequest.findById(seller.shopId);
      } catch (e) {}
    }
    console.log({
      sellerId: seller._id,
      username: seller.username,
      shopId: seller.shopId,
      shopName: shop ? shop.shopName : null
    });
  }
  await mongoose.disconnect();
}

main().catch(err => { console.error(err); process.exit(1); });
