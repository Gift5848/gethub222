const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const orderController = require('../controllers/orderController');
const auth = require('../middleware/authMiddleware');
const { adminOnly, restrictUnapprovedSubadmin, requireSubadmin } = require('../middleware/authMiddleware');

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

module.exports = router;
