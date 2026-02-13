import Notification from '../models/Notification.js';
import { asyncHandler } from '../middleware/error.js';

/**
 * @desc    Get all notifications for current user
 * @route   GET /api/notifications
 * @access  Private
 */
export const getNotifications = asyncHandler(async (req, res) => {
    const { page = 1, limit = 20, unreadOnly = false } = req.query;

    const query = { recipient: req.user._id };

    if (unreadOnly === 'true') {
        query.isRead = false;
    }

    const notifications = await Notification.find(query)
        .populate('sender', 'name avatar')
        .sort({ createdAt: -1 })
        .limit(limit * 1)
        .skip((page - 1) * limit);

    const total = await Notification.countDocuments(query);
    const unreadCount = await Notification.countDocuments({
        recipient: req.user._id,
        isRead: false
    });

    res.json({
        success: true,
        count: notifications.length,
        total,
        unreadCount,
        pages: Math.ceil(total / limit),
        currentPage: parseInt(page),
        notifications,
    });
});

/**
 * @desc    Mark notification as read
 * @route   PUT /api/notifications/:id/read
 * @access  Private
 */
export const markAsRead = asyncHandler(async (req, res) => {
    const notification = await Notification.findById(req.params.id);

    if (!notification) {
        return res.status(404).json({
            success: false,
            message: 'Notification not found',
        });
    }

    // Check if notification belongs to user
    if (notification.recipient.toString() !== req.user._id.toString()) {
        return res.status(403).json({
            success: false,
            message: 'Not authorized',
        });
    }

    notification.isRead = true;
    notification.readAt = Date.now();
    await notification.save();

    res.json({
        success: true,
        message: 'Notification marked as read',
    });
});

/**
 * @desc    Mark all notifications as read
 * @route   PUT /api/notifications/read-all
 * @access  Private
 */
export const markAllAsRead = asyncHandler(async (req, res) => {
    await Notification.updateMany(
        { recipient: req.user._id, isRead: false },
        { isRead: true, readAt: Date.now() }
    );

    res.json({
        success: true,
        message: 'All notifications marked as read',
    });
});

/**
 * @desc    Delete notification
 * @route   DELETE /api/notifications/:id
 * @access  Private
 */
export const deleteNotification = asyncHandler(async (req, res) => {
    const notification = await Notification.findById(req.params.id);

    if (!notification) {
        return res.status(404).json({
            success: false,
            message: 'Notification not found',
        });
    }

    // Check if notification belongs to user
    if (notification.recipient.toString() !== req.user._id.toString()) {
        return res.status(403).json({
            success: false,
            message: 'Not authorized',
        });
    }

    await notification.deleteOne();

    res.json({
        success: true,
        message: 'Notification deleted',
    });
});

/**
 * @desc    Get unread count
 * @route   GET /api/notifications/unread-count
 * @access  Private
 */
export const getUnreadCount = asyncHandler(async (req, res) => {
    const count = await Notification.countDocuments({
        recipient: req.user._id,
        isRead: false,
    });

    res.json({
        success: true,
        count,
    });
});
