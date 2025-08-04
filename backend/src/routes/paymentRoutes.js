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
router.post('/chapa/webhook', async (req, res) => {
  // Chapa sends payment status updates here
  const { event, data } = req.body;
  if (!data || !data.tx_ref) {
    return res.status(400).json({ error: 'Missing tx_ref in webhook data' });
  }
  try {
    // Find the order by tx_ref (assuming tx_ref is stored as order _id or a field in Order)
    const Order = require('../models/order');
    const User = require('../models/user');
    const order = await Order.findOne({ _id: data.tx_ref });
    if (!order) {
      return res.status(404).json({ error: 'Order not found for tx_ref' });
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
      // Send notification to buyer's room
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
      // Notify seller
      if (order.seller) {
        io.to(order.seller.toString()).emit('orderNotification', {
          type: 'new_paid_order',
          orderId: order._id,
          message: `A new order has been paid and is ready for processing. Order ID: ${order._id}`
        });
      }
      // Notify all admins (broadcast to 'admin' room)
      io.to('admin').emit('orderNotification', {
        type: 'new_paid_order',
        orderId: order._id,
        message: `A new order has been paid. Order ID: ${order._id}`
      });
    }

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
