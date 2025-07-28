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

module.exports = router;
