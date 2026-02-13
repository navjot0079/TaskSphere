import ProjectMessage from '../models/ProjectMessage.js';
import Project from '../models/Project.js';
import Notification from '../models/Notification.js';
import { asyncHandler } from '../middleware/error.js';

/**
 * @desc    Get project messages
 * @route   GET /api/projects/:id/messages
 * @access  Private (Project members only)
 */
export const getProjectMessages = asyncHandler(async (req, res) => {
    const { limit = 50, page = 1 } = req.query;
    const projectId = req.params.id;

    // Check if user is member
    const project = await Project.findById(projectId);
    if (!project) {
        return res.status(404).json({
            success: false,
            message: 'Project not found',
        });
    }

    const isMember = project.members.some(m => m.user.toString() === req.user._id.toString()) ||
        project.owner.toString() === req.user._id.toString();

    if (!isMember && req.user.role !== 'admin') {
        return res.status(403).json({
            success: false,
            message: 'Only project members can view messages',
        });
    }

    const messages = await ProjectMessage.find({ project: projectId })
        .populate('sender', 'name email avatar')
        .sort({ createdAt: -1 })
        .limit(limit * 1)
        .skip((page - 1) * limit);

    const total = await ProjectMessage.countDocuments({ project: projectId });

    res.json({
        success: true,
        count: messages.length,
        total,
        pages: Math.ceil(total / limit),
        messages: messages.reverse(), // Reverse to show oldest first
    });
});

/**
 * @desc    Send project message
 * @route   POST /api/projects/:id/messages
 * @access  Private (Project members only)
 */
export const sendProjectMessage = asyncHandler(async (req, res) => {
    const projectId = req.params.id;

    // Check if user is member
    const project = await Project.findById(projectId);
    if (!project) {
        return res.status(404).json({
            success: false,
            message: 'Project not found',
        });
    }

    const isMember = project.members.some(m => m.user.toString() === req.user._id.toString()) ||
        project.owner.toString() === req.user._id.toString();

    if (!isMember && req.user.role !== 'admin') {
        return res.status(403).json({
            success: false,
            message: 'Only project members can send messages',
        });
    }

    const message = await ProjectMessage.create({
        project: projectId,
        sender: req.user._id,
        message: req.body.message,
        recipientId: req.body.recipientId || null, // Support direct messages
        attachments: req.body.attachments || [],
    });

    await message.populate('sender', 'name email avatar');

    // Create notifications for message recipients
    const io = req.app.get('io');

    if (req.body.recipientId) {
        // Direct message - notify only the recipient
        if (req.body.recipientId !== req.user._id.toString()) {
            const notification = await Notification.create({
                recipient: req.body.recipientId,
                sender: req.user._id,
                type: 'direct_message',
                title: 'New Direct Message',
                message: `${req.user.name} sent you a message: ${req.body.message.substring(0, 50)}${req.body.message.length > 50 ? '...' : ''}`,
                link: `/projects/${projectId}`,
                relatedProject: projectId,
            });

            // Emit notification to recipient
            if (io) {
                io.to(`user:${req.body.recipientId}`).emit('notification:new', {
                    ...notification.toObject(),
                    sender: { _id: req.user._id, name: req.user.name, avatar: req.user.avatar },
                });
            }
        }
    } else {
        // Group message - notify all project members except sender
        const membersToNotify = project.members
            .filter(m => m.user.toString() !== req.user._id.toString())
            .map(m => m.user);

        // Add project owner if not already in members and not the sender
        if (project.owner.toString() !== req.user._id.toString() &&
            !membersToNotify.includes(project.owner)) {
            membersToNotify.push(project.owner);
        }

        // Create notifications for all members
        const notifications = await Promise.all(
            membersToNotify.map(async (memberId) => {
                const notification = await Notification.create({
                    recipient: memberId,
                    sender: req.user._id,
                    type: 'group_message',
                    title: `New message in ${project.name}`,
                    message: `${req.user.name}: ${req.body.message.substring(0, 50)}${req.body.message.length > 50 ? '...' : ''}`,
                    link: `/projects/${projectId}`,
                    relatedProject: projectId,
                });

                // Emit notification to each member
                if (io) {
                    io.to(`user:${memberId}`).emit('notification:new', {
                        ...notification.toObject(),
                        sender: { _id: req.user._id, name: req.user.name, avatar: req.user.avatar },
                    });
                }

                return notification;
            })
        );
    }

    // Emit real-time message via Socket.io
    if (io) {
        io.to(`project:${projectId}`).emit('project:newMessage', message);
    }

    res.status(201).json({
        success: true,
        message: message,
    });
});

/**
 * @desc    Mark message as read
 * @route   PUT /api/projects/:id/messages/:messageId/read
 * @access  Private
 */
export const markMessageAsRead = asyncHandler(async (req, res) => {
    const message = await ProjectMessage.findById(req.params.messageId);

    if (!message) {
        return res.status(404).json({
            success: false,
            message: 'Message not found',
        });
    }

    // Check if already read
    const alreadyRead = message.readBy.some(r => r.user.toString() === req.user._id.toString());

    if (!alreadyRead) {
        message.readBy.push({
            user: req.user._id,
            readAt: new Date(),
        });
        await message.save();
    }

    res.json({
        success: true,
    });
});

/**
 * @desc    Delete project message
 * @route   DELETE /api/projects/:id/messages/:messageId
 * @access  Private (Message sender or admin)
 */
export const deleteProjectMessage = asyncHandler(async (req, res) => {
    const message = await ProjectMessage.findById(req.params.messageId);

    if (!message) {
        return res.status(404).json({
            success: false,
            message: 'Message not found',
        });
    }

    // Check permissions
    const isSender = message.sender.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';

    if (!isSender && !isAdmin) {
        return res.status(403).json({
            success: false,
            message: 'Not authorized to delete this message',
        });
    }

    await message.deleteOne();

    // Emit real-time deletion
    const io = req.app.get('io');
    if (io) {
        io.to(`project:${message.project}`).emit('project:messageDeleted', {
            messageId: req.params.messageId,
        });
    }

    res.json({
        success: true,
        message: 'Message deleted successfully',
    });
});
