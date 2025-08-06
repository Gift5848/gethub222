// Script to backfill wallets for all existing shops and sellers
const mongoose = require('mongoose');
const Wallet = require('../src/models/wallet');
const ShopRequest = require('../src/models/shopRequest');
const User = require('../src/models/user');

async function createWalletForShop(shopId) {
  const existing = await Wallet.findOne({ shopId });
  if (!existing) {
    const wallet = new Wallet({ shopId });
    await wallet.save();
    console.log(`Created wallet for shopId: ${shopId}`);
  } else {
    console.log(`Wallet already exists for shopId: ${shopId}`);
  }
}

async function main() {
  await mongoose.connect('mongodb://localhost:27017/auto_spareparts');
  // All shops
  const shops = await ShopRequest.find({});
  for (const shop of shops) {
    await createWalletForShop(shop._id);
  }
  // All sellers (ensure their shop has a wallet)
  const sellers = await User.find({ role: 'seller' });
  for (const seller of sellers) {
    if (seller.shopId) {
      await createWalletForShop(seller.shopId);
    }
  }
  await mongoose.disconnect();
  console.log('Wallet backfill complete.');
}

main().catch(e => { console.error(e); process.exit(1); });
