const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const orderController = require('../controllers/orderController');
const auth = require('../middleware/authMiddleware');
const { adminOnly, restrictUnapprovedSubadmin, requireSubadmin } = require('../middleware/authMiddleware');
const walletController = require('../controllers/walletController');

// Analytics (admin only)
router.get('/analytics', auth, restrictUnapprovedSubadmin, adminOnly, adminController.getAnalytics);
// Activity log (admin only)
router.get('/activity-log', auth, restrictUnapprovedSubadmin, adminOnly, adminController.getActivityLog);
// Notifications (admin only)
router.get('/notifications', auth, restrictUnapprovedSubadmin, adminOnly, adminController.getNotifications);
router.post('/notifications/:id/read', auth, restrictUnapprovedSubadmin, adminOnly, adminController.markNotificationRead);

// Subadmin: Get their own orders
router.get('/subadmin/orders', auth, requireSubadmin, orderController.getSubadminOrders);
// Subadmin: Get their own analytics
router.get('/subadmin/analytics', auth, requireSubadmin, orderController.getSubadminAnalytics);
// Shop registration requests (admin only)
router.get('/shop-requests', auth, restrictUnapprovedSubadmin, adminOnly, adminController.getShopRequests);
router.patch('/shop-requests/:id', auth, restrictUnapprovedSubadmin, adminOnly, adminController.handleShopRequestAction);
// Create delivery person (admin only)
router.post('/create-delivery', auth, restrictUnapprovedSubadmin, adminOnly, adminController.createDeliveryPerson);

// Admin wallet management endpoints
// Get all wallet transactions for all shops
router.get('/wallet/transactions', (req, res, next) => {
  console.log('HIT /api/admin/wallet/transactions');
  next();
}, auth, restrictUnapprovedSubadmin, adminOnly, walletController.getAllShopTransactions);
// Get receipt for a specific transaction
router.get('/wallet/:walletId/transaction/:txIndex/receipt', auth, restrictUnapprovedSubadmin, adminOnly, walletController.getTransactionReceipt);
// Approve/reject a wallet deposit
router.patch('/wallet/:walletId/transaction/:txIndex/approve', auth, restrictUnapprovedSubadmin, adminOnly, walletController.approveWalletDeposit);
// Manual credit/debit endpoints
router.post('/wallet/manual-credit', auth, restrictUnapprovedSubadmin, adminOnly, walletController.manualCredit);
router.post('/wallet/manual-debit', auth, restrictUnapprovedSubadmin, adminOnly, walletController.manualDebit);

module.exports = router;
