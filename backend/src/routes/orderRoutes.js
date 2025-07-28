const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const auth = require('../middleware/authMiddleware');

// Create order (user checkout)
router.post('/', auth, orderController.createOrder);
// Get all orders (admin)
router.get('/', auth, orderController.getAllOrders);
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
// Get current user's orders
router.get('/my', auth, orderController.getMyOrders);

module.exports = router;
