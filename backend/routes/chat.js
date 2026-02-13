import express from 'express';
import {
    getMessages,
    sendMessage,
    markAsRead,
    deleteMessage,
    getConversations,
    getUnreadCount,
} from '../controllers/chatController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// All routes are protected
router.use(protect);

// Conversation routes
router.get('/conversations', getConversations);
router.get('/unread-count', getUnreadCount);

// Message routes
router.get('/messages/:userId', getMessages);
router.post('/messages', sendMessage);
router.put('/messages/:userId/read', markAsRead);
router.delete('/messages/:messageId', deleteMessage);

export default router;
