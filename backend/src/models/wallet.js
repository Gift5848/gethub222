const mongoose = require('mongoose');

const walletSchema = new mongoose.Schema({
  shopId: { type: mongoose.Schema.Types.ObjectId, ref: 'ShopRequest', required: true, unique: true },
  balance: { type: Number, default: 0 },
  frozen: { type: Number, default: 0 },
  transactions: [
    {
      type: { type: String, enum: ['deposit', 'freeze', 'debit', 'unfreeze', 'fee'], required: true },
      amount: { type: Number, required: true },
      date: { type: Date, default: Date.now },
      description: String
    }
  ],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Wallet', walletSchema);
