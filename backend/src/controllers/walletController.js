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
  const { shopId, amount } = req.body;
  if (!shopId || !amount || amount <= 0) return res.status(400).json({ error: 'Invalid input' });
  const wallet = await Wallet.findOne({ shopId });
  if (!wallet) return res.status(404).json({ error: 'Wallet not found' });
  wallet.balance += amount;
  wallet.transactions.push({ type: 'deposit', amount, description: 'Deposit' });
  await wallet.save();
  await sendWalletNotification(shopId, `Deposited ${amount} birr to your wallet.`);
  res.json(wallet);
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
