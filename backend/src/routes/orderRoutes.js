const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const auth = require('../middleware/authMiddleware');
const multer = require('multer');
const path = require('path');
const uploadReceipt = require('../middleware/uploadReceipt');
const orderWithReceiptController = require('../controllers/orderWithReceiptController');

// Multer setup for proof uploads
const proofStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, '../../uploads/proof'));
  },
  filename: function (req, file, cb) {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});
const uploadProof = multer({ storage: proofStorage });

// Delivery: must be before any /:id route!
router.get('/delivery', auth, orderController.getDeliveryOrders);
router.post('/:id/accept', auth, orderController.acceptDeliveryOrder); // Delivery accept
router.post('/:id/reject', auth, orderController.rejectDeliveryOrder); // Delivery reject
// Create order (user checkout)
router.post('/', auth, orderController.createOrder);
// Create order with payment receipt (CBE/Telebirr)
router.post('/with-receipt', auth, uploadReceipt.single('receipt'), orderWithReceiptController.createOrderWithReceipt);
// Get all orders (admin)
router.get('/', auth, orderController.getAllOrders);
// Get current user's orders
router.get('/my', auth, orderController.getMyOrders);
// Get order by ID
router.get('/:id', auth, orderController.getOrderById);
// Update order status (admin)
router.patch('/:id', auth, orderController.updateOrderStatus);
// Delete order (admin)
router.delete('/:id', auth, orderController.deleteOrder);
// Cart management
router.post('/cart/add', auth, orderController.addToCart);
router.get('/cart', auth, orderController.getCart);
router.post('/cart/remove', auth, orderController.removeFromCart);
// Place order from cart
router.post('/place-order', auth, orderController.placeOrder);
// Payment processing
router.post('/pay', auth, orderController.payOrder);
// Delivery
router.post('/deliver', auth, orderController.deliverOrder);
// Mark order as paid
router.patch('/:id/pay', auth, orderController.markOrderPaid);
// Proof of delivery upload (must be before /:id)
router.post('/:id/proof', auth, uploadProof.single('proof'), orderController.uploadProofOfDelivery);
// Invoice download
router.get('/:id/invoice', auth, orderController.downloadInvoice);
// Shipment tracking
router.get('/:id/track', auth, orderController.trackShipment);
// Reorder
router.post('/:id/reorder', auth, orderController.reorder);
// Submit review
router.post('/:id/review', auth, orderController.submitReview);
// Public order status endpoint for payment confirmation (no auth required)
router.get('/public/:id', async (req, res) => {
  try {
    const Order = require('../models/order');
    const order = await Order.findById(req.params.id);
    if (!order) {
      // Always return JSON, even if not found
      return res.status(404).json({ error: 'Order not found', paymentStatus: 'unknown', status: 'unknown' });
    }
    res.json({ paymentStatus: order.paymentStatus, status: order.status });
  } catch (err) {
    // Always return JSON on error
    res.status(500).json({ error: err.message, paymentStatus: 'unknown', status: 'unknown' });
  }
});
// Get all orders for a seller (only their own orders)
router.get('/my-seller-orders', auth, orderController.getMySellerOrders);
// Admin: Approve or reject CBE/Telebirr payment
router.patch('/:id/approve-payment', auth, require('../middleware/authMiddleware').adminOnly, orderController.approveOrderPayment);
// Mark as handed over to delivery person
router.patch('/:id/handedover', auth, orderController.markOrderHandedOver);
// Mark as delivered by delivery person
router.patch('/:id/delivered', auth, orderController.markOrderDelivered);
// Mark as confirmed by delivery person
router.patch('/:id/confirmed', auth, orderController.markOrderConfirmed);
// Mark as received by buyer
router.patch('/:id/buyerreceived', auth, orderController.markOrderBuyerReceived);

module.exports = router;
