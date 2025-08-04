const Order = require('../models/order');
const path = require('path');

// Create order with payment receipt upload
exports.createOrderWithReceipt = async (req, res) => {
  try {
    // Parse JSON fields from FormData
    const products = JSON.parse(req.body.products);
    const deliveryLatLng = req.body.deliveryLatLng ? JSON.parse(req.body.deliveryLatLng) : undefined;
    const orderData = {
      products,
      buyer: req.body.buyer,
      seller: req.body.seller,
      shopId: req.body.shopId,
      deliveryLocation: req.body.deliveryLocation,
      deliveryLatLng,
      deliveryOption: req.body.deliveryOption,
      paymentMethod: req.body.paymentMethod,
      paymentTransaction: req.body.paymentTransaction,
      total: req.body.total,
      paymentApprovalStatus: 'pending',
      paymentStatus: 'unpaid',
      shippingAddress: req.body.deliveryLocation, // Always set shippingAddress for delivery
    };
    if (req.file) {
      orderData.receiptUrl = `/uploads/receipts/${req.file.filename}`;
    }
    const order = new Order(orderData);
    await order.save();
    res.status(201).json(order);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
