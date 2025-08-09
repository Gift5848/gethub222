const mongoose = require('mongoose');
const Wallet = require('../models/wallet');
const ShopRequest = require('../models/shopRequest');
const User = require('../models/user');

// Send notification (stub, replace with real notification logic)
const sendWalletNotification = async (shopId, message) => {
  // Find shop owner
  const shopUser = await User.findOne({ shopId });
  if (shopUser && shopUser.email) {
    // TODO: Integrate with real notification/email system
    console.log(`[NOTIFY] Wallet: ${shopUser.email} - ${message}`);
  }
};

// Create wallet for a shop (called after shop registration)
exports.createWalletForShop = async (shopId) => {
  const existing = await Wallet.findOne({ shopId });
  if (!existing) {
    const wallet = new Wallet({ shopId });
    await wallet.save();
    return wallet;
  }
  return existing;
};

// Deposit funds into wallet
exports.deposit = async (req, res) => {
  console.log('[DEPOSIT RAW BODY]', req.body);
  console.log('[DEPOSIT RAW FILE]', req.file);
  let { shopId, amount, paymentMethod, paymentCode } = req.body;
  console.log('[DEPOSIT DEBUG] Received:', { shopId, amount, paymentMethod, paymentCode });
  if (!shopId || !amount || isNaN(amount) || Number(amount) <= 0) {
    console.log('[DEPOSIT ERROR] Invalid input:', { shopId, amount });
    return res.status(400).json({ error: 'Invalid input' });
  }
  console.log('[DEPOSIT DEBUG] Raw shopId before conversion:', shopId);
  // Convert shopId to ObjectId if needed
  if (typeof shopId === 'string') {
    const hex24 = /^[a-fA-F0-9]{24}$/;
    if (shopId.length === 24 && hex24.test(shopId)) {
      try {
        shopId = new mongoose.Types.ObjectId(shopId);
      } catch (e) {
        console.log('[DEPOSIT ERROR] Failed to convert shopId to ObjectId:', e, 'Value:', shopId);
        return res.status(400).json({ error: 'Invalid shopId format' });
      }
    } else {
      console.log('[DEPOSIT ERROR] shopId not valid hex:', shopId);
      return res.status(400).json({ error: 'Invalid shopId format' });
    }
  }
  const wallet = await Wallet.findOne({ shopId });
  if (!wallet) return res.status(404).json({ error: 'Wallet not found' });
  console.log('[DEPOSIT DEBUG] req.file:', req.file);
  let receiptUrl = null;
  if (req.file && req.file.filename) {
    receiptUrl = `/uploads/receipts/${req.file.filename}`;
  }
  const transaction = {
    type: 'deposit',
    amount,
    description: `Deposit via ${paymentMethod || 'unknown'}${paymentCode ? ' (code: ' + paymentCode + ')' : ''}`,
    status: 'approved', // Instantly approve
    date: new Date(),
    receiptUrl
  };
  console.log('[DEPOSIT DEBUG] transaction:', transaction);
  wallet.transactions.push(transaction);
  wallet.balance += Number(amount); // Instantly update balance
  await wallet.save();
  await sendWalletNotification(shopId, `Deposit of ${amount} birr via ${paymentMethod || 'unknown'} credited to your wallet.`);
  res.json({ message: 'Deposit credited and approved.', wallet });
};

// Get wallet info for shop
exports.getWallet = async (req, res) => {
  const { shopId } = req.params;
  let queryShopId = shopId;
  console.log('[WALLET DEBUG] getWallet called with shopId:', shopId);
  // Convert to ObjectId if needed
  if (shopId && typeof shopId === 'string' && shopId.length === 24) {
    try {
      queryShopId = new mongoose.Types.ObjectId(shopId);
      console.log('[WALLET DEBUG] Converted shopId to ObjectId:', queryShopId);
    } catch (e) {
      console.log('[WALLET DEBUG] Failed to convert shopId to ObjectId:', e);
    }
  }
  const wallet = await Wallet.findOne({ shopId: queryShopId });
  if (!wallet) {
    console.log('[WALLET DEBUG] Wallet not found for shopId:', queryShopId);
    return res.status(404).json({ error: 'Wallet not found' });
  }
  console.log('[WALLET DEBUG] Wallet found:', wallet);
  res.json(wallet);
};

// Freeze 2% for product posting
exports.freezeForProduct = async (shopId, productPrice) => {
  const wallet = await Wallet.findOne({ shopId });
  if (!wallet) throw new Error('Wallet not found');
  const freezeAmount = Math.ceil(productPrice * 0.02);
  if (wallet.balance < freezeAmount) throw new Error('Insufficient wallet balance');
  wallet.balance -= freezeAmount;
  wallet.frozen += freezeAmount;
  wallet.transactions.push({ type: 'freeze', amount: freezeAmount, description: 'Freeze for product post' });
  await wallet.save();
  return { freezeAmount, wallet };
};

// Debit frozen amount as fee (on sale)
exports.debitFrozen = async (shopId, amount) => {
  const wallet = await Wallet.findOne({ shopId });
  if (!wallet) throw new Error('Wallet not found');
  if (wallet.frozen < amount) throw new Error('Insufficient frozen balance');
  wallet.frozen -= amount;
  wallet.transactions.push({ type: 'fee', amount, description: 'Platform fee on sale' });
  await wallet.save();
  return wallet;
};

// Show wallet calculation for posting
exports.getWalletCalculation = async (req, res) => {
  const { shopId, productPrice } = req.query;
  const wallet = await Wallet.findOne({ shopId });
  if (!wallet) return res.status(404).json({ error: 'Wallet not found' });
  const freezeAmount = Math.ceil(productPrice * 0.02);
  const availableAfter = wallet.balance - freezeAmount;
  res.json({
    currentBalance: wallet.balance,
    productPrice,
    requiredFrozen: freezeAmount,
    availableAfter,
    frozenBalance: wallet.frozen
  });
};

// Transaction history for a shop's wallet
exports.getTransactionHistory = async (req, res) => {
  const { shopId } = req.params;
  let queryShopId = shopId;
  // Convert to ObjectId if needed
  if (shopId && typeof shopId === 'string' && shopId.length === 24) {
    try {
      queryShopId = new mongoose.Types.ObjectId(shopId);
    } catch (e) {}
  }
  const wallet = await Wallet.findOne({ shopId: queryShopId });
  if (!wallet) return res.status(404).json({ error: 'Wallet not found' });
  res.json(wallet.transactions.slice(-30).reverse()); // Last 30 transactions, newest first
};

// Refund (admin only)
exports.refund = async (req, res) => {
  if (!req.user || req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
  const { shopId, amount } = req.body;
  if (!shopId || !amount || amount <= 0) return res.status(400).json({ error: 'Invalid input' });
  const wallet = await Wallet.findOne({ shopId });
  if (!wallet) return res.status(404).json({ error: 'Wallet not found' });
  wallet.balance += amount;
  wallet.transactions.push({ type: 'refund', amount, description: 'Admin refund' });
  await wallet.save();
  await sendWalletNotification(shopId, `Refunded ${amount} birr to your wallet.`);
  res.json(wallet);
};

// Admin top-up (admin only)
exports.adminTopUp = async (req, res) => {
  if (!req.user || req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
  const { shopId, amount } = req.body;
  if (!shopId || !amount || amount <= 0) return res.status(400).json({ error: 'Invalid input' });
  const wallet = await Wallet.findOne({ shopId });
  if (!wallet) return res.status(404).json({ error: 'Wallet not found' });
  wallet.balance += amount;
  wallet.transactions.push({ type: 'deposit', amount, description: 'Admin top-up' });
  await wallet.save();
  await sendWalletNotification(shopId, `Admin topped up your wallet by ${amount} birr.`);
  res.json(wallet);
};

// Admin: Get all wallet transactions for all shops
exports.getAllShopTransactions = async (req, res) => {
  try {
    const transactions = await Wallet.aggregate([
      { $unwind: "$transactions" },
      { $lookup: {
          from: "shoprequests",
          localField: "shopId",
          foreignField: "_id",
          as: "shop"
        }
      },
      { $unwind: "$shop" },
      { $project: {
          _id: 1,
          shopId: 1,
          shopName: "$shop.shopName",
          shopEmail: "$shop.email",
          transaction: "$transactions"
        }
      },
      { $sort: { "transaction.date": -1 } }
    ]);
    res.json(transactions);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Admin: Get receipt for a specific transaction (by wallet and transaction index)
exports.getTransactionReceipt = async (req, res) => {
  try {
    const { walletId, txIndex } = req.params;
    const wallet = await Wallet.findById(walletId);
    if (!wallet || !wallet.transactions[txIndex]) return res.status(404).json({ message: 'Transaction not found.' });
    res.json({ receiptUrl: wallet.transactions[txIndex].receiptUrl || null });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Admin: Approve or reject a wallet deposit
exports.approveWalletDeposit = async (req, res) => {
  try {
    const { walletId, txIndex } = req.params;
    const { action } = req.body; // 'approve' or 'reject'
    const wallet = await Wallet.findById(walletId);
    if (!wallet || !wallet.transactions[txIndex]) return res.status(404).json({ message: 'Transaction not found.' });
    const tx = wallet.transactions[txIndex];
    // Remove approval rule: always approve and credit deposit immediately
    tx.status = 'approved';
    if (tx.type === 'deposit') {
      wallet.balance += tx.amount;
    }
    wallet.markModified('transactions');
    wallet.updatedAt = new Date();
    await wallet.save();
    res.json({ message: 'Transaction approved.', transaction: wallet.transactions[txIndex], balance: wallet.balance });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Admin: Manual credit to a shop wallet
exports.manualCredit = async (req, res) => {
  if (!req.user || req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
  const { shopId, amount, reason } = req.body;
  if (!shopId || !amount || amount <= 0) return res.status(400).json({ error: 'Invalid input' });
  const wallet = await Wallet.findOne({ shopId });
  if (!wallet) return res.status(404).json({ error: 'Wallet not found' });
  wallet.balance += amount;
  wallet.transactions.push({ type: 'deposit', amount, description: reason || 'Manual credit', status: 'approved' });
  await wallet.save();
  res.json(wallet);
};

// Admin: Manual debit from a shop wallet
exports.manualDebit = async (req, res) => {
  if (!req.user || req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
  const { shopId, amount, reason } = req.body;
  if (!shopId || !amount || amount <= 0) return res.status(400).json({ error: 'Invalid input' });
  const wallet = await Wallet.findOne({ shopId });
  if (!wallet) return res.status(404).json({ error: 'Wallet not found' });
  if (wallet.balance < amount) return res.status(400).json({ error: 'Insufficient balance' });
  wallet.balance -= amount;
  wallet.transactions.push({ type: 'debit', amount, description: reason || 'Manual debit', status: 'approved' });
  await wallet.save();
  res.json(wallet);
};

// Get wallet balance by walletId (admin)
exports.getWalletBalanceById = async (req, res) => {
  const { walletId } = req.params;
  try {
    const wallet = await Wallet.findById(walletId);
    if (!wallet) return res.status(404).json({ error: 'Wallet not found' });
    res.json({ balance: wallet.balance });
  } catch (err) {
    res.status(400).json({ error: 'Invalid walletId' });
  }
};
