import DirectMessage from '../models/DirectMessage.js';
import User from '../models/User.js';
import { asyncHandler } from '../middleware/error.js';

/**
 * @desc    Get messages between two users
 * @route   GET /api/chat/messages/:userId
 * @access  Private
 */
export const getMessages = asyncHandler(async (req, res) => {
    const { userId } = req.params;
    const { limit = 50, page = 1 } = req.query;

    // Verify the other user exists
    const otherUser = await User.findById(userId);
    if (!otherUser) {
        return res.status(404).json({
            success: false,
            message: 'User not found',
        });
    }

    // Get messages between current user and other user
    const messages = await DirectMessage.find({
        $or: [
            { sender: req.user._id, recipient: userId },
            { sender: userId, recipient: req.user._id },
        ],
    })
        .populate('sender', 'name email avatar')
        .populate('recipient', 'name email avatar')
        .sort({ createdAt: -1 })
        .limit(limit * 1)
        .skip((page - 1) * limit);

    const total = await DirectMessage.countDocuments({
        $or: [
            { sender: req.user._id, recipient: userId },
            { sender: userId, recipient: req.user._id },
        ],
    });

    res.json({
        success: true,
        count: messages.length,
        total,
        pages: Math.ceil(total / limit),
        messages: messages.reverse(), // Reverse to show oldest first
    });
});

/**
 * @desc    Send a message
 * @route   POST /api/chat/messages
 * @access  Private
 */
export const sendMessage = asyncHandler(async (req, res) => {
    const { recipient, content, type, fileUrl, fileName, fileSize } = req.body;

    // Verify recipient exists
    const recipientUser = await User.findById(recipient);
    if (!recipientUser) {
        return res.status(404).json({
            success: false,
            message: 'Recipient not found',
        });
    }

    // Create message
    const message = await DirectMessage.create({
        sender: req.user._id,
        recipient,
        content,
        type: type || 'text',
        fileUrl,
        fileName,
        fileSize,
        status: 'sent',
    });

    // Populate sender info
    await message.populate('sender', 'name email avatar');
    await message.populate('recipient', 'name email avatar');

    res.status(201).json({
        success: true,
        message,
    });
});

/**
 * @desc    Mark messages as read
 * @route   PUT /api/chat/messages/:userId/read
 * @access  Private
 */
export const markAsRead = asyncHandler(async (req, res) => {
    const { userId } = req.params;

    // Mark all unread messages from this user as read
    await DirectMessage.updateMany(
        {
            sender: userId,
            recipient: req.user._id,
            isRead: false,
        },
        {
            isRead: true,
            readAt: new Date(),
            status: 'read',
        }
    );

    res.json({
        success: true,
        message: 'Messages marked as read',
    });
});

/**
 * @desc    Delete a message
 * @route   DELETE /api/chat/messages/:messageId
 * @access  Private
 */
export const deleteMessage = asyncHandler(async (req, res) => {
    const { messageId } = req.params;

    const message = await DirectMessage.findById(messageId);

    if (!message) {
        return res.status(404).json({
            success: false,
            message: 'Message not found',
        });
    }

    // Only sender can delete their message
    if (message.sender.toString() !== req.user._id.toString()) {
        return res.status(403).json({
            success: false,
            message: 'Not authorized to delete this message',
        });
    }

    await message.deleteOne();

    res.json({
        success: true,
        message: 'Message deleted',
    });
});

/**
 * @desc    Get all conversations
 * @route   GET /api/chat/conversations
 * @access  Private
 */
export const getConversations = asyncHandler(async (req, res) => {
    // Get all unique users the current user has chatted with
    const sentMessages = await DirectMessage.distinct('recipient', {
        sender: req.user._id,
    });

    const receivedMessages = await DirectMessage.distinct('sender', {
        recipient: req.user._id,
    });

    // Combine and get unique user IDs
    const userIds = [...new Set([...sentMessages, ...receivedMessages])];

    // Get user details and last message for each conversation
    const conversations = await Promise.all(
        userIds.map(async (userId) => {
            const user = await User.findById(userId).select('name email avatar');

            // Get last message
            const lastMessage = await DirectMessage.findOne({
                $or: [
                    { sender: req.user._id, recipient: userId },
                    { sender: userId, recipient: req.user._id },
                ],
            })
                .sort({ createdAt: -1 })
                .populate('sender', 'name');

            // Get unread count
            const unreadCount = await DirectMessage.countDocuments({
                sender: userId,
                recipient: req.user._id,
                isRead: false,
            });

            return {
                user,
                lastMessage,
                unreadCount,
            };
        })
    );

    // Sort by last message time
    conversations.sort((a, b) => {
        const timeA = a.lastMessage?.createdAt || 0;
        const timeB = b.lastMessage?.createdAt || 0;
        return timeB - timeA;
    });

    res.json({
        success: true,
        count: conversations.length,
        conversations,
    });
});

/**
 * @desc    Get unread message count
 * @route   GET /api/chat/unread-count
 * @access  Private
 */
export const getUnreadCount = asyncHandler(async (req, res) => {
    const count = await DirectMessage.countDocuments({
        recipient: req.user._id,
        isRead: false,
    });

    res.json({
        success: true,
        count,
    });
});
