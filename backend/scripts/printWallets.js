// Script to print all wallet documents and their shopId values
const mongoose = require('mongoose');
const Wallet = require('../src/models/wallet');

async function main() {
  await mongoose.connect('mongodb://localhost:27017/auto_spareparts');
  const wallets = await Wallet.find({});
  wallets.forEach(w => {
    console.log(`Wallet _id: ${w._id}, shopId: ${w.shopId}, balance: ${w.balance}, frozen: ${w.frozen}`);
  });
  await mongoose.disconnect();
  console.log('Done.');
}

main().catch(e => { console.error(e); process.exit(1); });
