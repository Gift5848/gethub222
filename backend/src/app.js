require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const authRoutes = require('./routes/authRoutes');
const productRoutes = require('./routes/productRoutes');
const adminRoutes = require('./routes/adminRoutes');
const orderRoutes = require('./routes/orderRoutes');
const messageRoutes = require('./routes/messageRoutes');
const wishlistRoutes = require('./routes/wishlistRoutes');
const dbConfig = require('./config/db');
const cors = require('cors');
const path = require('path');
const Order = require('./models/order');
const http = require('http');
const { Server } = require('socket.io');
const authMiddleware = require('./middleware/authMiddleware');
const Message = require('./models/message');
const paymentRoutes = require('./routes/paymentRoutes');

const app = express();
const PORT = process.env.PORT || 5000;
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

app.use(express.json());
app.use(cors());

// Serve uploaded images statically
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Global request logger
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
  next();
});

dbConfig();

app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/wishlist', wishlistRoutes);
app.use('/api/payment', paymentRoutes);

// Get total unread chat messages for the current user
app.get('/api/messages/unread-count', authMiddleware, async (req, res) => {
  try {
    const userId = req.user._id;
    const unreadCount = await Message.countDocuments({ to: userId, read: false });
    res.json({ unreadCount });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Make io accessible throughout the app
app.set('io', io);

io.on('connection', (socket) => {
  console.log('A user connected to Socket.IO');

  // Join a room for each user (by userId)
  socket.on('join', (userId) => {
    if (userId) {
      socket.join(userId);
    }
  });

  // Typing indicator event (emit only to recipient's room)
  socket.on('typing', (data) => {
    if (data && data.to) {
      io.to(data.to).emit('typing', data);
    }
  });

  // When a new message is sent, emit only to the recipient's room
  socket.on('newMessage', (data) => {
    if (data && data.to) {
      io.to(data.to).emit('newMessage', data);
    }
  });

  // Read receipts: mark messages as read and notify sender
  socket.on('messagesRead', async (data) => {
    try {
      if (data && data.from && data.to && data.productId) {
        // Update messages in DB (import Message model here)
        const Message = require('./models/message');
        await Message.updateMany({
          product: data.productId,
          from: data.from,
          to: data.to,
          read: false
        }, { $set: { read: true } });
        // Notify sender
        io.to(data.from).emit('messagesRead', data);
      }
    } catch (e) {
      console.log('messagesRead error:', e);
    }
  });

  // Delivery receipts: mark messages as delivered and notify sender
  socket.on('messageDelivered', async (data) => {
    try {
      if (data && data.from && data.to && data.productId && data.messageId) {
        // Update message in DB (import Message model here)
        const Message = require('./models/message');
        await Message.updateOne({
          _id: data.messageId,
          from: data.from,
          to: data.to
        }, { $set: { delivered: true } });
        // Notify sender
        io.to(data.from).emit('messageDelivered', data);
      }
    } catch (e) {
      console.log('messageDelivered error:', e);
    }
  });

  socket.on('disconnect', () => {
    console.log('A user disconnected from Socket.IO');
  });
});

server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});