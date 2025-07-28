const Order = require('../models/order');
const Product = require('../models/product');
const User = require('../models/user');

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
    // Always set shopId from authenticated user
    const orderData = {
      ...req.body,
      shopId: req.user.shopId,
    };
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
    const orders = await Order.find().populate('products.product', 'name price').populate('buyer', 'username email').populate('seller', 'username email');
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
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });
    const order = await Order.findByIdAndUpdate(req.params.id, { status: req.body.status }, { new: true });
    if (!order) return res.status(404).json({ error: 'Order not found' });
    res.json(order);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Delete order (admin)
const deleteOrder = async (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });
    const order = await Order.findByIdAndDelete(req.params.id);
    if (!order) return res.status(404).json({ error: 'Order not found' });
    res.json({ message: 'Order deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// --- CART MANAGEMENT ---
// Add item to cart
const addToCart = async (req, res) => {
  // Stub implementation
  res.status(200).json({ message: 'addToCart not implemented yet.' });
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
    // Build order products array
    const products = cart.map(item => ({
      product: item.productId,
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
      console.log('FULL debugProduct:', debugProduct);
      seller = debugProduct && (debugProduct.get?.('seller') || debugProduct.seller || debugProduct.owner)
        ? String(debugProduct.get?.('seller') || debugProduct.seller || debugProduct.owner)
        : null;
    }
    if (!req.user._id) {
      return res.status(400).json({ error: 'User not authenticated. buyer field is missing.' });
    }
    console.log('DEBUG placeOrder:', {
      userId: req.user._id,
      shopId: req.user.shopId,
      seller,
      product: debugProduct
    });
    if (!seller) {
      return res.status(400).json({ error: 'Seller not found for product. Please check your product data.' });
    }
    if (!req.user.shopId) {
      return res.status(400).json({ error: 'User does not have a shopId. Please check your user data.' });
    }
    // Create order
    const order = new Order({
      buyer: req.user._id,
      buyerId: req.user.buyerId, // Set buyerId from user
      products,
      total,
      status: 'pending',
      shopId: req.user.shopId,
      seller
    });
    await order.save();
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
  // ...add other functions here as needed
};

