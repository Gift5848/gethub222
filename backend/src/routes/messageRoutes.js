const express = require('express');
const router = express.Router();
const messageController = require('../controllers/messageController');
const auth = require('../middleware/authMiddleware');

// Send a message (buyer to seller)
router.post('/send', auth, messageController.sendMessage);
// Get messages for a product
router.get('/', auth, messageController.getMessages);
// Upload file in chat
router.post('/upload', auth, messageController.uploadChatFile);
// List all conversations for the current user
router.get('/conversations', auth, messageController.listConversations);
// Get all messages between two users about a product
router.get('/conversation', auth, messageController.getConversation);
// Get all messages between two users about a product (no mark as read)
router.get('/conversation-raw', auth, messageController.getConversationRaw);

module.exports = router;
