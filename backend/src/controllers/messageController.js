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
    const { productId, text, toUserId } = req.body;
    if (!productId || !text) return res.status(400).json({ error: 'Missing product or text' });
    const product = await Product.findById(productId);
    if (!product) return res.status(404).json({ error: 'Product not found' });
    let recipientId;
    // If toUserId is provided, use it (user-to-user chat); else default to product owner (legacy)
    if (toUserId) {
      recipientId = toUserId;
    } else {
      recipientId = product.owner;
    }
    if (recipientId.toString() === req.user._id.toString()) {
      return res.status(400).json({ error: 'Cannot send message to yourself.' });
    }
    const message = new Message({
      product: productId,
      from: req.user._id,
      to: recipientId,
      text,
      delivered: false // Explicitly set delivered to false on creation
    });
    await message.save();
    // Emit Socket.IO event to recipient (and optionally sender)
    try {
      const io = req.app.get('io');
      if (io) {
        io.to(recipientId.toString()).emit('newMessage', {
          message: message.toObject(),
          to: recipientId,
          from: req.user._id,
          productId,
          messageId: message._id
        });
      }
    } catch (e) { console.log('Socket.IO emit error:', e); }
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
    const { productId, text, toUserId } = req.body;
    console.log('UPLOAD DEBUG:', { productId, text, toUserId, file: req.file });
    if (!productId) return res.status(400).json({ error: 'Missing productId' });
    if (!req.file) return res.status(400).json({ error: 'Missing file' });
    const product = await Product.findById(productId);
    if (!product) return res.status(404).json({ error: 'Product not found' });
    let recipientId;
    if (toUserId) {
      recipientId = toUserId;
    } else {
      recipientId = product.owner;
    }
    if (!recipientId) return res.status(400).json({ error: 'Missing recipientId' });
    const fileData = {
      url: '/uploads/' + req.file.filename,
      name: req.file.originalname,
      type: req.file.mimetype
    };
    const message = new Message({
      product: productId,
      from: req.user._id,
      to: recipientId,
      text: text || '',
      file: fileData,
      delivered: false
    });
    await message.save();
    // Emit Socket.IO event to recipient
    try {
      const io = req.app.get('io');
      if (io) {
        io.to(recipientId.toString()).emit('newMessage', {
          message: message.toObject(),
          to: recipientId,
          from: req.user._id,
          productId,
          messageId: message._id
        });
      }
    } catch (e) { console.log('Socket.IO emit error:', e); }
    res.status(201).json(message);
  } catch (err) {
    console.log('UPLOAD ERROR:', err);
    res.status(500).json({ error: err.message });
  }
}];

// List all conversations for the current user (grouped by product and other user)
exports.listConversations = async (req, res) => {
  try {
    const userId = req.user._id;
    // Find all messages where user is sender or recipient
    const messages = await Message.find({
      $or: [
        { from: userId },
        { to: userId }
      ]
    })
      .populate('from', 'username email')
      .populate('to', 'username email')
      .populate('product', 'name');

    // Group by product and other user
    const conversations = {};
    messages.forEach(msg => {
      const productId = msg.product?._id?.toString() || (msg.product && msg.product.toString());
      const otherUser = msg.from._id.toString() === userId ? msg.to : msg.from;
      const key = productId + '-' + otherUser._id;
      // Count unread messages for this conversation
      const isUnread = msg.to._id.toString() === userId && msg.read === false;
      if (!conversations[key]) {
        conversations[key] = {
          product: msg.product,
          user: otherUser,
          lastMessage: msg,
          updatedAt: msg.createdAt,
          unreadCount: isUnread ? 1 : 0
        };
      } else {
        if (msg.createdAt > conversations[key].updatedAt) {
          conversations[key].lastMessage = msg;
          conversations[key].updatedAt = msg.createdAt;
        }
        if (isUnread) {
          conversations[key].unreadCount += 1;
        }
      }
    });
    res.json(Object.values(conversations));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Get all messages between two users about a product
exports.getConversation = async (req, res) => {
  try {
    const userId = req.user._id;
    const { productId, otherUserId } = req.query;
    if (!productId || !otherUserId) return res.status(400).json({ error: 'Missing productId or otherUserId' });
    const messages = await Message.find({
      product: productId,
      $or: [
        { from: userId, to: otherUserId },
        { from: otherUserId, to: userId }
      ]
    })
      .populate('from', 'username email')
      .populate('to', 'username email')
      .sort({ createdAt: 1 });
    // Mark all messages sent to the current user as read
    await Message.updateMany({
      product: productId,
      from: otherUserId,
      to: userId,
      read: false
    }, { $set: { read: true } });
    res.json(messages);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Get all messages between two users about a product (no mark as read)
exports.getConversationRaw = async (req, res) => {
  try {
    const userId = req.user._id;
    const { productId, otherUserId } = req.query;
    if (!productId || !otherUserId) return res.status(400).json({ error: 'Missing productId or otherUserId' });
    const messages = await Message.find({
      product: productId,
      $or: [
        { from: userId, to: otherUserId },
        { from: otherUserId, to: userId }
      ]
    })
      .populate('from', 'username email')
      .populate('to', 'username email')
      .sort({ createdAt: 1 });
    res.json(messages);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
