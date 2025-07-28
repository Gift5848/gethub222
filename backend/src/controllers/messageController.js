const Message = require('../models/message');
const Product = require('../models/product');
const User = require('../models/user');
const multer = require('multer');
const path = require('path');

// Multer setup for chat file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, '../../uploads'));
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + '-' + file.originalname);
  }
});
const upload = multer({ storage });

// Send a message from buyer to seller
exports.sendMessage = async (req, res) => {
  try {
    // Only normal users can send messages
    if (!req.user || req.user.role !== 'user') {
      return res.status(403).json({ error: 'Only normal users can use chat.' });
    }
    const { productId, text } = req.body;
    if (!productId || !text) return res.status(400).json({ error: 'Missing product or text' });
    const product = await Product.findById(productId);
    if (!product) return res.status(404).json({ error: 'Product not found' });
    const sellerId = product.owner;
    const message = new Message({
      product: productId,
      from: req.user._id,
      to: sellerId,
      text
    });
    await message.save();
    res.status(201).json(message);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Get messages for a product (for seller or buyer)
exports.getMessages = async (req, res) => {
  try {
    // Only normal users can view messages
    if (!req.user || req.user.role !== 'user') {
      return res.status(403).json({ error: 'Only normal users can view chat.' });
    }
    const { productId } = req.query;
    if (!productId) return res.status(400).json({ error: 'Missing productId' });
    const messages = await Message.find({ product: productId })
      .populate('from', 'username email')
      .populate('to', 'username email')
      .sort({ createdAt: 1 });
    res.json(messages);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// File upload endpoint for chat
exports.uploadChatFile = [upload.single('file'), async (req, res) => {
  try {
    if (!req.user || req.user.role !== 'user') {
      return res.status(403).json({ error: 'Only normal users can upload files.' });
    }
    const { productId, text } = req.body;
    if (!productId || !req.file) return res.status(400).json({ error: 'Missing product or file' });
    const product = await Product.findById(productId);
    if (!product) return res.status(404).json({ error: 'Product not found' });
    const sellerId = product.owner;
    const fileData = {
      url: '/uploads/' + req.file.filename,
      name: req.file.originalname,
      type: req.file.mimetype
    };
    const message = new Message({
      product: productId,
      from: req.user._id,
      to: sellerId,
      text: text || '',
      file: fileData
    });
    await message.save();
    res.status(201).json(message);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}];
