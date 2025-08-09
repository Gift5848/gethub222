// Script to backfill missing status fields in wallet transactions
const mongoose = require('mongoose');
const Wallet = require('../src/models/wallet');

async function main() {
  await mongoose.connect('mongodb://localhost:27017/auto_spareparts');
  const wallets = await Wallet.find({});
  let updatedCount = 0;
  for (const wallet of wallets) {
    let changed = false;
    for (const tx of wallet.transactions) {
      if (!tx.status) {
        // Assume old deposits are approved, others are pending
        if (tx.type === 'deposit') {
          tx.status = 'approved';
        } else {
          tx.status = 'pending';
        }
        changed = true;
      }
    }
    if (changed) {
      await wallet.save();
      updatedCount++;
    }
  }
  await mongoose.disconnect();
  console.log(`Backfilled status for ${updatedCount} wallets.`);
}

main().catch(e => { console.error(e); process.exit(1); });
