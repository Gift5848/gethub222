const express = require('express');
const router = express.Router();
const axios = require('axios');

const CHAPA_SECRET_KEY = process.env.CHAPA_SECRET_KEY; // Set this in your .env file

// Chapa payment initialization endpoint
router.post('/chapa', async (req, res) => {
  const { amount, currency, email, first_name, last_name, tx_ref, return_url } = req.body;
  try {
    const chapaRes = await axios.post(
      'https://api.chapa.co/v1/transaction/initialize',
      {
        amount,
        currency,
        email,
        first_name,
        last_name,
        tx_ref,
        return_url
      },
      {
        headers: {
          Authorization: `Bearer ${CHAPA_SECRET_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );
    res.json({ checkout_url: chapaRes.data.data.checkout_url });
  } catch (err) {
    res.status(500).json({ error: err.response?.data || err.message });
  }
});

// Chapa payment webhook/callback endpoint
router.post('/callback/chapa/webhook', async (req, res) => {
  // Chapa sends payment status updates here
  const { event, data } = req.body;
  if (!data || !data.tx_ref) {
    return res.status(400).json({ error: 'Missing tx_ref in webhook data' });
  }
  try {
    // Log incoming webhook payload for debugging
    console.log('Chapa Webhook Received:', JSON.stringify(req.body));

    // Chapa signature verification (optional, recommended)
    const chapaSignature = req.headers['chapa-signature'];
    const expectedSignature = process.env.CHAPA_WEBHOOK_SECRET; // Set this in your .env
    if (expectedSignature && chapaSignature !== expectedSignature) {
      return res.status(401).json({ error: 'Invalid Chapa signature' });
    }

    // Find the order by tx_ref (assuming tx_ref is stored as order _id or a field in Order)
    const Order = require('../models/order');
    const Product = require('../models/product');
    const User = require('../models/user');
    let found = false;
    // Try to find and update an order
    const order = await Order.findOne({ _id: data.tx_ref });
    if (order) {
      // Idempotency: avoid double-processing
      if (order.paymentStatus === 'paid') {
        return res.json({ success: true, message: 'Order already marked as paid' });
      }
      // Update paymentStatus based on Chapa event
      let notificationType = '';
      if (event === 'charge.completed' && data.status === 'success') {
        order.paymentStatus = 'paid';
        order.status = 'processing'; // Optionally update order status
        notificationType = 'payment_success';
      } else {
        order.paymentStatus = 'failed';
        notificationType = 'payment_failed';
      }
      await order.save();
      // In-app notification via Socket.IO
      const io = req.app.get('io');
      if (io && order.buyer) {
        io.to(order.buyer.toString()).emit('orderNotification', {
          type: notificationType,
          orderId: order._id,
          message: notificationType === 'payment_success'
            ? 'Your payment was successful! Your order is now processing.'
            : 'Your payment failed. Please try again or contact support.'
        });
      }
      // Admin/Seller notifications for new paid orders
      if (io && notificationType === 'payment_success') {
        if (order.seller) {
          io.to(order.seller.toString()).emit('orderNotification', {
            type: 'new_paid_order',
            orderId: order._id,
            message: `A new order has been paid and is ready for processing. Order ID: ${order._id}`
          });
        }
        io.to('admin').emit('orderNotification', {
          type: 'new_paid_order',
          orderId: order._id,
          message: `A new order has been paid. Order ID: ${order._id}`
        });
      }
      found = true;
    }
    // If not order, try to find and update a product post by tx_ref
    if (!found) {
      const product = await Product.findOne({ paymentCode: data.tx_ref });
      if (product) {
        // Idempotency: avoid double-processing
        if (product.status === 'active') {
          return res.json({ success: true, message: 'Product already marked as active' });
        }
        if (event === 'charge.completed' && data.status === 'success') {
          product.status = 'active';
          product.paymentMethod = 'chapa';
          product.paymentApprovalStatus = 'approved';
        } else {
          product.paymentApprovalStatus = 'rejected';
        }
        await product.save();
        // Optionally notify the user (owner)
        const io = req.app.get('io');
        if (io && product.owner) {
          io.to(product.owner.toString()).emit('productNotification', {
            type: product.status === 'active' ? 'post_paid' : 'post_payment_failed',
            productId: product._id,
            message: product.status === 'active'
              ? 'Your paid product post is now active!'
              : 'Your product post payment failed. Please try again.'
          });
        }
        found = true;
      }
    }
    if (!found) {
      return res.status(404).json({ error: 'Order or Product not found for tx_ref' });
    }

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Chapa payment status check endpoint for both orders and product posts
router.get('/chapa/status', async (req, res) => {
  const tx_ref = req.query.tx_ref;
  if (!tx_ref) return res.status(400).json({ error: 'Missing tx_ref' });
  try {
    // Check order by _id
    const Order = require('../models/order');
    const order = await Order.findOne({ _id: tx_ref });
    if (order) {
      return res.json({ status: order.paymentStatus === 'paid' ? 'success' : 'pending', confirmationCode: order._id });
    }
    // Check product by paymentCode
    const Product = require('../models/product');
    const product = await Product.findOne({ paymentCode: tx_ref });
    if (product) {
      return res.json({ status: (product.status === 'active' && product.paymentApprovalStatus === 'approved') ? 'success' : 'pending', confirmationCode: product.paymentCode });
    }
    return res.status(404).json({ error: 'Not found' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
