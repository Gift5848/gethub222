const Order = require('../models/order');
const Product = require('../models/product');
const User = require('../models/user');
const Wallet = require('../models/wallet');
const { sendOrderNotification } = require('../utils/notify');
const { geocodeAddress } = require('../utils/geocode');
const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');
const walletController = require('./walletController');

// Get all orders for a subadmin (seller)
const getSubadminOrders = async (req, res) => {
  try {
    let sellerIds = [req.user._id];
    if (req.user.role === 'subadmin') {
      // Subadmin: get all sellers managed by this subadmin
      const sellers = await User.find({ owner: req.user._id }, '_id privileges');
      sellerIds = sellers.filter(s => s.privileges?.canViewOrders !== false).map(s => s._id);
    } else if (req.user.role === 'user') {
      // Seller privilege check
      if (!req.user.privileges?.canViewOrders) {
        return res.status(403).json({ error: 'You do not have permission to view orders.' });
      }
    }
    // Enforce shop-based isolation
    const orders = await Order.find({ seller: { $in: sellerIds }, shopId: req.user.shopId })
      .populate('products.product', 'name price')
      .populate('buyer', 'username email');
    res.json(orders);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Get analytics for a subadmin (total revenue, total orders, best seller, revenue by month, orders by status, top products)
const getSubadminAnalytics = async (req, res) => {
  try {
    let sellerIds = [req.user._id];
    if (req.user.role === 'subadmin') {
      const sellers = await User.find({ owner: req.user._id }, '_id');
      sellerIds = sellers.map(s => s._id);
    }
    // Enforce shop-based isolation
    const orders = await Order.find({ seller: { $in: sellerIds }, shopId: req.user.shopId });
    const totalOrders = orders.length;
    const totalRevenue = orders.reduce((sum, o) => sum + (o.total || 0), 0);
    // Best seller (product with most quantity sold)
    const productSales = {};
    const statusCounts = {};
    const revenueByMonth = Array(12).fill(0);
    const now = new Date();
    for (const order of orders) {
      // Orders by status
      statusCounts[order.status] = (statusCounts[order.status] || 0) + 1;
      // Revenue by month (last 12 months)
      const orderDate = new Date(order.createdAt);
      const monthDiff = (now.getFullYear() - orderDate.getFullYear()) * 12 + (now.getMonth() - orderDate.getMonth());
      if (monthDiff >= 0 && monthDiff < 12) {
        revenueByMonth[11 - monthDiff] += order.total;
      }
      // Product sales
      for (const item of order.products) {
        const pid = String(item.product);
        productSales[pid] = (productSales[pid] || 0) + item.quantity;
      }
    }
    // Top-selling products
    let topProducts = Object.entries(productSales)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
    // Fetch product names for top products
    topProducts = await Promise.all(topProducts.map(async ([pid, qty]) => {
      const prod = await Product.findById(pid).select('name');
      return { name: prod ? prod.name : 'Unknown', qty };
    }));
    // Best seller
    let bestSeller = topProducts.length > 0 ? topProducts[0].name : null;
    res.json({
      totalOrders,
      totalRevenue,
      bestSeller,
      revenueByMonth,
      statusCounts,
      topProducts
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// You should also update order creation, update, and delete endpoints to set and filter by shopId.
// Example for order creation:
const createOrder = async (req, res) => {
  try {
    // DEBUG: Log incoming order creation request
    console.log('[ORDER CREATE] req.body:', req.body);
    // Always set shopId from authenticated user if not provided
    const orderData = {
      ...req.body,
      shopId: req.body.shopId || req.user.shopId,
    };
    console.log('[ORDER CREATE] resolved shopId:', orderData.shopId);
    // Geocode address if present and no lat/lng
    if (orderData.address && (!orderData.lat || !orderData.lng)) {
      try {
        const coords = await geocodeAddress(orderData.address);
        orderData.lat = coords.lat;
        orderData.lng = coords.lng;
      } catch (geoErr) {
        console.warn('Geocoding failed:', geoErr.message);
      }
    }
    const order = new Order(orderData);
    await order.save();
    res.status(201).json(order);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Get all orders (admin)
const getAllOrders = async (req, res) => {
  try {
    // Only admin can see all orders
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });
    const filter = {};
    if (req.query.deliveryPerson) {
      filter.deliveryPerson = req.query.deliveryPerson;
    }
    const orders = await Order.find(filter)
      .populate('products.product', 'name price')
      .populate('buyer', 'username email')
      .populate('seller', 'username email')
      .populate({ path: 'shopId', select: 'shopName location address' }); // Add shopId population
    res.json(orders);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Get order by ID
const getOrderById = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id).populate('products.product', 'name price').populate('buyer', 'username email').populate('seller', 'username email');
    if (!order) return res.status(404).json({ error: 'Order not found' });
    // Only admin, seller, or buyer can view
    if (req.user.role !== 'admin' && String(order.buyer) !== String(req.user._id) && String(order.seller) !== String(req.user._id)) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    res.json(order);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Update order status (admin)
const updateOrderStatus = async (req, res) => {
  try {
    if (req.user.role !== 'admin' && req.user.role !== 'subadmin') return res.status(403).json({ error: 'Forbidden' });
    const update = { status: req.body.status };
    if (req.body.deliveryPerson !== undefined) {
      update.deliveryPerson = req.body.deliveryPerson;
    }
    const order = await Order.findByIdAndUpdate(req.params.id, update, { new: true });
    if (!order) return res.status(404).json({ error: 'Order not found' });
    // Emit real-time update
    const io = req.app.get('io');
    if (io) emitOrdersUpdate(io);
    res.json(order);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Delete order (admin)
const deleteOrder = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ error: 'Order not found' });
    // Debug logging
    console.log('DEBUG CANCEL ORDER:', {
      userId: req.user._id,
      userRole: req.user.role,
      orderBuyer: order.buyer?.toString(),
      orderSeller: order.seller?.toString(),
      orderStatus: order.status
    });
    // Allow admin to delete any order
    // Allow user/seller/subadmin to cancel their own pending order (as buyer)
    // Allow seller/subadmin to cancel if they are the seller of the order and status is pending
    if (
      req.user.role === 'admin' ||
      ((['user', 'seller', 'subadmin'].includes(req.user.role)) && order.buyer.toString() === req.user._id.toString() && order.status === 'pending') ||
      ((['seller', 'subadmin'].includes(req.user.role)) && order.seller.toString() === req.user._id.toString() && order.status === 'pending')
    ) {
      await Order.findByIdAndDelete(req.params.id);
      return res.json({ message: 'Order deleted' });
    } else {
      // More debug info
      return res.status(403).json({ error: `Forbidden: role=${req.user.role}, userId=${req.user._id}, orderBuyer=${order.buyer?.toString()}, orderSeller=${order.seller?.toString()}, orderStatus=${order.status}` });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// --- CART MANAGEMENT ---
// Add item to cart
const addToCart = async (product) => {
  let cart = JSON.parse(localStorage.getItem(cartKey)) || [];
  let productDetails = product;
  try {
    const res = await axios.get(`/api/products/${product._id}`);
    productDetails = res.data;
  } catch (e) {}
  // Always use owner._id as seller
  let sellerId = '';
  if (productDetails.owner && productDetails.owner._id) {
    sellerId = productDetails.owner._id;
  }
  if (!sellerId) {
    alert('Error: This product has no owner._id and cannot be added to cart for ordering.');
    return;
  }
  const productWithSeller = { ...productDetails, seller: sellerId };
  const existing = cart.find(item => item._id === product._id);
  if (existing) {
    if (existing.quantity < productDetails.stock) {
      existing.quantity = (existing.quantity || 1) + 1;
    } else {
      return;
    }
  } else {
    if (productDetails.stock > 0) {
      cart.push({ ...productWithSeller, quantity: 1 });
    } else {
      return;
    }
  }
  cart = cart.map(item => ({ ...item, quantity: item.quantity || 1, seller: item.seller || sellerId }));
  localStorage.setItem(cartKey, JSON.stringify(cart));
  updateCartCount();
  if (onAddToCart) onAddToCart();
};

// Remove item from cart
const removeFromCart = async (req, res) => {
  // Stub implementation
  res.status(200).json({ message: 'removeFromCart not implemented yet.' });
};

// Get cart (stub)
const getCart = async (req, res) => {
  // Stub implementation
  res.status(200).json({ message: 'getCart not implemented yet.' });
};

// --- PLACE ORDER FROM CART ---
const placeOrder = async (req, res) => {
  try {
    const cart = req.body.cart || [];
    if (!cart.length) {
      return res.status(400).json({ error: 'Cart is empty.' });
    }
    // Build order products array, support both _id and productId
    const products = cart.map(item => ({
      product: item._id || item.productId,
      quantity: item.quantity,
      price: item.price
    }));
    // Calculate total
    const total = products.reduce((sum, item) => sum + item.price * item.quantity, 0);
    // Get seller from first product, fallback to owner
    let seller = null;
    let debugProduct = null;
    if (products[0]?.product) {
      debugProduct = await Product.findById(products[0].product);
      seller = debugProduct && (debugProduct.get?.('seller') || debugProduct.seller || debugProduct.owner)
        ? String(debugProduct.get?.('seller') || debugProduct.seller || debugProduct.owner)
        : null;
    }
    if (!req.user._id) {
      return res.status(400).json({ error: 'User not authenticated. buyer field is missing.' });
    }
    // Determine shopId: prefer req.user.shopId, else get from seller
    let shopId = req.user.shopId;
    let sellerUser = null;
    if (!shopId && seller) {
      sellerUser = await User.findById(seller);
      shopId = sellerUser?.shopId;
    }
    // Debug logging
    console.log('DEBUG placeOrder:');
    console.log('  cart:', cart);
    console.log('  products:', products);
    console.log('  seller:', seller);
    console.log('  sellerUser:', sellerUser);
    console.log('  resolved shopId:', shopId);
    if (!shopId) {
      return res.status(400).json({ error: 'No shopId found for order. Please check user and seller data.' });
    }
    // Create order
    const order = new Order({
      buyer: req.user._id,
      buyerId: req.user.buyerId, // Set buyerId from user
      products,
      total,
      status: 'pending',
      shopId,
      seller
    });
    await order.save();
    // After order is saved, debit frozen 2% as platform fee for each product's shop
    for (const item of products) {
      const product = await Product.findById(item.product);
      if (product && product.shopId) {
        const fee = Math.ceil(product.price * 0.02);
        try {
          await walletController.debitFrozen(product.shopId, fee);
        } catch (err) {
          // Log error but do not block order placement
          console.error('Wallet fee debit error:', err.message);
        }
      }
    }
    // Send notification to user and seller
    try {
      const buyerUser = await User.findById(req.user._id);
      if (buyerUser?.email) {
        await sendOrderNotification({
          to: buyerUser.email,
          subject: 'Order Confirmation',
          text: `Thank you for your order! Order ID: ${order._id}, Total: $${order.total}`
        });
      }
      if (sellerUser?.email) {
        await sendOrderNotification({
          to: sellerUser.email,
          subject: 'New Order Received',
          text: `You have received a new order. Order ID: ${order._id}, Total: $${order.total}`
        });
      }
    } catch (notifyErr) {
      console.error('Order notification failed:', notifyErr);
    }
    res.status(201).json(order);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// --- PAYMENT PROCESSING ---
const payOrder = async (req, res) => {
  // Stub implementation
  res.status(200).json({ message: 'payOrder not implemented yet.' });
};

// --- DELIVERY ---
const deliverOrder = async (req, res) => {
  // Stub implementation
  res.status(200).json({ message: 'deliverOrder not implemented yet.' });
};

// Get current user's orders
const getMyOrders = async (req, res) => {
  try {
    // Find orders where buyer is the current user
    const orders = await Order.find({ buyer: req.user._id })
      .populate('products.product', 'name price')
      .populate('seller', 'username email');
    res.json(orders);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Mark order as paid
const markOrderPaid = async (req, res) => {
  try {
    const order = await Order.findByIdAndUpdate(
      req.params.id,
      { paymentStatus: 'paid' },
      { new: true }
    );
    if (!order) return res.status(404).json({ error: 'Order not found' });
    res.json(order);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Get all orders assigned to a delivery person
const getDeliveryOrders = async (req, res) => {
  try {
    if (req.user.role !== 'delivery') return res.status(403).json({ error: 'Forbidden' });
    const deliveryPersonValues = [req.user.username, req.user.email, req.user._id?.toString()].filter(Boolean);
    const orders = await Order.find({ deliveryPerson: { $in: deliveryPersonValues } })
      .populate('products.product', 'name price')
      .populate('buyer', 'username email phone')
      .populate('seller', 'username email')
      .populate({ path: 'shopId', select: 'shopName location address' });
    // Attach buyer address (from order.shippingAddress if available)
    const ordersWithLocations = orders.map(order => {
      // Shop location
      const shopLocation = order.shopId?.location || order.shopId?.address || '';
      // Buyer phone: always from user
      const buyerPhone = order.buyer?.phone || '';
      // Buyer location: always from order.shippingAddress (set at order time), fallback to user.address
      let buyerLocation = order.shippingAddress || '';
      if (!buyerLocation && order.buyer && order.buyer.address) buyerLocation = order.buyer.address;
      return {
        ...order.toObject(),
        shop: order.shopId ? {
          name: order.shopId.shopName,
          location: order.shopId.location,
          address: order.shopId.address
        } : null,
        shopLocation,
        buyerLocation,
        buyerAddress: buyerLocation,
        buyerPhone,
        estimatedDeliveryPrice: order.total * 0.05 // Example: 5% of total as delivery price
      };
    });
    // --- Emit real-time update to all delivery clients ---
    const io = req.app.get('io');
    if (io) {
      io.emit('orders_update', ordersWithLocations);
    }
    res.json(ordersWithLocations);
  } catch (err) {
    res.status(500).json({ error: err.message, stack: err.stack });
  }
};

// Proof of delivery upload
const uploadProofOfDelivery = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ error: 'Order not found' });
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    // Save file path to order (add field if needed)
    order.proofOfDelivery = `/uploads/proof/${req.file.filename}`;
    order.status = 'delivered';
    await order.save();
    // Emit real-time update
    const io = req.app.get('io');
    if (io) emitOrdersUpdate(io);
    res.json({ message: 'Proof of delivery uploaded.', order });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Download invoice as PDF
const downloadInvoice = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('products.product', 'name price description')
      .populate('buyer', 'username email')
      .populate('seller', 'username email');
    if (!order) return res.status(404).json({ error: 'Order not found' });
    if (req.user.role !== 'admin' && String(order.buyer._id) !== String(req.user._id) && String(order.seller._id) !== String(req.user._id)) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=invoice-${order._id}.pdf`);
    const doc = new PDFDocument({ size: 'A4', margin: 60 });
    doc.pipe(res);

    // Centered Invoice Title
    doc.fontSize(28).font('Helvetica-Bold').text('Invoice', { align: 'center' });
    doc.moveDown(2);

    // Order Details
    doc.fontSize(13).font('Helvetica');
    doc.text(`Order ID: ${order._id}`);
    doc.text(`Date: ${order.createdAt.toString()}`);
    doc.text(`Buyer: ${order.buyer?.username || order.buyer}`);
    doc.text(`Total: $${order.total}`);
    doc.moveDown(2);

    // Products Section
    doc.fontSize(13).font('Helvetica-Bold').text('Products:', { align: 'left' });
    doc.moveDown(0.5);
    doc.font('Helvetica');
    order.products.forEach(item => {
      doc.text(`- ${item.product?.name || 'Product'}  x ${item.quantity} @ $${item.price}`);
    });
    doc.end();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Track shipment (stub)
const trackShipment = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ error: 'Order not found' });
    res.json({ trackingNumber: order.trackingNumber, status: 'In Transit' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Reorder (add products to cart)
const reorder = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id).populate('products.product');
    if (!order) return res.status(404).json({ error: 'Order not found' });
    // Only buyer can reorder
    if (String(order.buyer) !== String(req.user._id)) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    // Return products for frontend to add to cart
    res.json({ products: order.products });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Submit review
const submitReview = async (req, res) => {
  try {
    const { rating, comment } = req.body;
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ error: 'Order not found' });
    if (String(order.buyer) !== String(req.user._id)) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    order.reviews.push({ user: req.user._id, rating, comment });
    await order.save();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Get all orders for a seller (only their own orders)
const getMySellerOrders = async (req, res) => {
  try {
    if (req.user.role !== 'user') return res.status(403).json({ error: 'Forbidden' });
    // Only orders where this seller is the seller and shop matches
    const orders = await Order.find({ seller: req.user._id, shopId: req.user.shopId })
      .populate('products.product', 'name price')
      .populate('buyer', 'username email');
    res.json(orders);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Admin: Approve or reject CBE/Telebirr payment
const approveOrderPayment = async (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });
    const { id } = req.params;
    const { action } = req.body; // 'approve' or 'reject'
    const order = await Order.findById(id);
    if (!order) return res.status(404).json({ error: 'Order not found' });
    if (order.paymentMethod !== 'cbe' && order.paymentMethod !== 'telebirr') {
      return res.status(400).json({ error: 'Not a CBE/Telebirr order' });
    }
    if (action === 'approve') {
      order.paymentApprovalStatus = 'approved';
      order.paymentStatus = 'paid';
      order.status = 'processing';
      // --- Auto-assign delivery person ---
      // Find an available delivery person (simplest: first active/approved delivery user)
      const deliveryPerson = await User.findOne({ role: 'delivery', active: true, approved: true });
      if (deliveryPerson) {
        order.deliveryPerson = deliveryPerson._id.toString();
        // In-app notification via Socket.IO
        const io = req.app.get('io');
        if (io) {
          io.to(deliveryPerson._id.toString()).emit('orderNotification', {
            type: 'new_delivery_order',
            orderId: order._id,
            message: `You have been assigned a new delivery order. Order ID: ${order._id}`
          });
        }
      }
      // Notify buyer
      try {
        const buyerUser = await User.findById(order.buyer);
        if (buyerUser?.email) {
          await sendOrderNotification({
            to: buyerUser.email,
            subject: 'Payment Approved',
            text: `Your payment for order ${order._id} has been approved. Your order is now being processed for delivery.`
          });
        }
      } catch (notifyErr) {
        console.error('Payment approval notification failed:', notifyErr);
      }
    } else if (action === 'reject') {
      order.paymentApprovalStatus = 'rejected';
      order.paymentStatus = 'unpaid';
    } else {
      return res.status(400).json({ error: 'Invalid action' });
    }
    await order.save();
    res.json({ message: `Order payment ${action}d.`, order });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Mark order as handed over to delivery person (seller action)
const markOrderHandedOver = async (req, res) => {
  try {
    const { id } = req.params;
    const order = await Order.findById(id);
    if (!order) return res.status(404).json({ error: 'Order not found' });
    // Allow seller, subadmin (who owns the seller), or any user with matching shopId to hand over
    if (req.user.role === 'seller') {
      if (String(order.seller) !== String(req.user._id)) {
        console.log('[HANDOVER] Forbidden: seller mismatch', { orderSeller: order.seller, userId: req.user._id });
        return res.status(403).json({ error: 'Forbidden' });
      }
    } else if (req.user.role === 'subadmin') {
      const sellerUser = await User.findById(order.seller);
      if (!sellerUser || String(sellerUser.owner) !== String(req.user._id)) {
        console.log('[HANDOVER] Forbidden: subadmin not owner', { sellerOwner: sellerUser?.owner, userId: req.user._id });
        return res.status(403).json({ error: 'Forbidden' });
      }
    } else if (req.user.shopId && String(order.shopId) === String(req.user.shopId)) {
      // Allow shop managers or users with matching shopId
      // Optionally, check for a specific shop manager role/privilege here
      if (req.user.active === false || req.user.approved === false) {
        console.log('[HANDOVER] Forbidden: shop user not active/approved', { userId: req.user._id, active: req.user.active, approved: req.user.approved });
        return res.status(403).json({ error: 'Forbidden: shop user not active/approved' });
      }
    } else {
      console.log('[HANDOVER] Forbidden: no matching role or shop', { user: req.user, orderShopId: order.shopId });
      return res.status(403).json({ error: 'Forbidden' });
    }
    order.status = 'handedover';
    await order.save();
    // Notify delivery person in-app
    const io = req.app.get('io');
    if (io && order.deliveryPerson) {
      io.to(order.deliveryPerson.toString()).emit('orderNotification', {
        type: 'order_handedover',
        orderId: order._id,
        message: `Order ${order._id} has been handed over to you by the seller.`
      });
      emitOrdersUpdate(io);
    }
    res.json({ message: 'Order marked as handed over to delivery person.', order });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Mark order as delivered (delivery person action)
const markOrderDelivered = async (req, res) => {
  try {
    const { id } = req.params;
    const order = await Order.findById(id);
    if (!order) return res.status(404).json({ error: 'Order not found' });
    // Only delivery person can mark as delivered
    if (req.user.role !== 'delivery' || String(order.deliveryPerson) !== String(req.user._id)) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    order.status = 'delivered';
    await order.save();
    // Notify buyer in-app
    const io = req.app.get('io');
    if (io && order.buyer) {
      io.to(order.buyer.toString()).emit('orderNotification', {
        type: 'order_delivered',
        orderId: order._id,
        message: `Your order ${order._id} has been delivered.`
      });
      emitOrdersUpdate(io);
    }
    res.json({ message: 'Order marked as delivered.', order });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Delivery person: Accept assigned order
const acceptDeliveryOrder = async (req, res) => {
  try {
    if (req.user.role !== 'delivery') return res.status(403).json({ error: 'Forbidden' });
    const { id } = req.params;
    const order = await Order.findById(id);
    if (!order) return res.status(404).json({ error: 'Order not found' });
    if (order.deliveryPerson !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Not your assigned order' });
    }
    if (order.status !== 'processing') {
      return res.status(400).json({ error: 'Order not in processing state' });
    }
    order.status = 'delivery_accepted';
    await order.save();
    res.json({ message: 'Order accepted for delivery', order });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Delivery person: Reject assigned order
const rejectDeliveryOrder = async (req, res) => {
  try {
    if (req.user.role !== 'delivery') return res.status(403).json({ error: 'Forbidden' });
    const { id } = req.params;
    const order = await Order.findById(id);
    if (!order) return res.status(404).json({ error: 'Order not found' });
    if (order.deliveryPerson !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Not your assigned order' });
    }
    if (order.status !== 'processing') {
      return res.status(400).json({ error: 'Order not in processing state' });
    }
    order.status = 'delivery_rejected';
    order.deliveryPerson = '';
    await order.save();
    res.json({ message: 'Order rejected for delivery', order });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Mark order as confirmed by delivery person (delivery person action)
const markOrderConfirmed = async (req, res) => {
  try {
    const { id } = req.params;
    const order = await Order.findById(id);
    if (!order) return res.status(404).json({ error: 'Order not found' });
    // Only delivery person can confirm
    if (req.user.role !== 'delivery' || String(order.deliveryPerson) !== String(req.user._id)) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    order.status = 'confirmed';
    await order.save();
    // Notify shop/subadmin in-app (optional)
    const io = req.app.get('io');
    if (io && order.seller) {
      io.to(order.seller.toString()).emit('orderNotification', {
        type: 'order_confirmed',
        orderId: order._id,
        message: `Order ${order._id} has been confirmed by the delivery person.`
      });
      emitOrdersUpdate(io);
    }
    res.json({ message: 'Order marked as confirmed by delivery person.', order });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Mark order as received by buyer (buyer action)
const markOrderBuyerReceived = async (req, res) => {
  try {
    const { id } = req.params;
    const order = await Order.findById(id);
    if (!order) return res.status(404).json({ error: 'Order not found' });
    // Only buyer can mark as received
    if (req.user.role !== 'user' || String(order.buyer) !== String(req.user._id)) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    order.status = 'buyerreceived';
    await order.save();
    // Notify delivery person in-app
    const io = req.app.get('io');
    if (io && order.deliveryPerson) {
      io.to(order.deliveryPerson.toString()).emit('orderNotification', {
        type: 'order_buyerreceived',
        orderId: order._id,
        message: `Order ${order._id} has been received by the buyer.`
      });
      emitOrdersUpdate(io);
    }
    res.json({ message: 'Order marked as received by buyer.', order });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Utility: emit real-time updates on order status changes, handover, delivery, and proof upload
function emitOrdersUpdate(io) {
  Order.find({})
    .populate('products.product', 'name price')
    .populate('buyer', 'username email phone')
    .populate('seller', 'username email')
    .populate({ path: 'shopId', select: 'shopName location address' })
    .then(orders => {
      const ordersWithLocations = orders.map(order => {
        // Shop location
        const shopLocation = order.shopId?.location || order.shopId?.address || '';
        // Buyer phone: always from user
        const buyerPhone = order.buyer?.phone || '';
        // Buyer location: always from order.shippingAddress (set at order time), fallback to user.address
        let buyerLocation = order.shippingAddress || '';
        if (!buyerLocation && order.buyer && order.buyer.address) buyerLocation = order.buyer.address;
        return {
          ...order.toObject(),
          shop: order.shopId ? {
            name: order.shopId.shopName,
            location: order.shopId.location,
            address: order.shopId.address
          } : null,
          shopLocation,
          buyerLocation,
          buyerAddress: buyerLocation,
          buyerPhone,
          estimatedDeliveryPrice: order.total * 0.05
        };
      });
      io.emit('orders_update', ordersWithLocations);
    });
}

module.exports = {
  getSubadminOrders,
  getSubadminAnalytics,
  createOrder,
  getAllOrders,
  getOrderById,
  updateOrderStatus,
  deleteOrder,
  placeOrder,
  addToCart,
  removeFromCart,
  getCart,
  payOrder,
  deliverOrder,
  getMyOrders,
  markOrderPaid,
  getDeliveryOrders,
  uploadProofOfDelivery,
  downloadInvoice,
  trackShipment,
  reorder,
  submitReview,
  getMySellerOrders,
  approveOrderPayment,
  markOrderHandedOver,
  markOrderDelivered,
  acceptDeliveryOrder,
  rejectDeliveryOrder,
  markOrderConfirmed,
  markOrderBuyerReceived,
  // ...add other functions here as needed
};

