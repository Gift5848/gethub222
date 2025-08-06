const express = require('express');
const router = express.Router();
const walletController = require('../controllers/walletController');
const auth = require('../middleware/authMiddleware');

// Get wallet calculation for product posting (must be before :shopId route)
router.get('/calculation', auth, walletController.getWalletCalculation);
// Get wallet info for a shop
router.get('/:shopId', auth, walletController.getWallet);
// Deposit funds
router.post('/deposit', auth, walletController.deposit);
// Transaction history
router.get('/:shopId/transactions', auth, walletController.getTransactionHistory);
// Refund (admin only)
router.post('/refund', auth, walletController.refund);
// Admin top-up (admin only)
router.post('/admin-topup', auth, walletController.adminTopUp);

module.exports = router;
