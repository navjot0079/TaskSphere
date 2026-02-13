import User from '../models/User.js';
import Task from '../models/Task.js';
import Project from '../models/Project.js';
import ActivityLog from '../models/ActivityLog.js';
import { asyncHandler } from '../middleware/error.js';

/**
 * @desc    Get current user profile
 * @route   GET /api/users/profile
 * @access  Private
 */
export const getProfile = asyncHandler(async (req, res) => {
    const user = await User.findById(req.user._id);

    res.json({
        success: true,
        user,
    });
});

/**
 * @desc    Update user profile
 * @route   PUT /api/users/profile
 * @access  Private
 */
export const updateProfile = asyncHandler(async (req, res) => {
    const fieldsToUpdate = {
        name: req.body.name,
        email: req.body.email,
        avatar: req.body.avatar,
        theme: req.body.theme,
    };

    // Remove undefined fields
    Object.keys(fieldsToUpdate).forEach(key =>
        fieldsToUpdate[key] === undefined && delete fieldsToUpdate[key]
    );

    const user = await User.findByIdAndUpdate(
        req.user._id,
        fieldsToUpdate,
        { new: true, runValidators: true }
    );

    res.json({
        success: true,
        message: 'Profile updated successfully',
        user,
    });
});

/**
 * @desc    Update notification settings
 * @route   PUT /api/users/notification-settings
 * @access  Private
 */
export const updateNotificationSettings = asyncHandler(async (req, res) => {
    const user = await User.findById(req.user._id);

    user.notificationSettings = {
        ...user.notificationSettings,
        ...req.body,
    };

    await user.save();

    res.json({
        success: true,
        message: 'Notification settings updated',
        notificationSettings: user.notificationSettings,
    });
});

/**
 * @desc    Change password
 * @route   PUT /api/users/change-password
 * @access  Private
 */
export const changePassword = asyncHandler(async (req, res) => {
    const { currentPassword, newPassword } = req.body;

    const user = await User.findById(req.user._id).select('+password');

    // Check current password
    const isMatch = await user.comparePassword(currentPassword);

    if (!isMatch) {
        return res.status(401).json({
            success: false,
            message: 'Current password is incorrect',
        });
    }

    // Set new password
    user.password = newPassword;
    await user.save();

    res.json({
        success: true,
        message: 'Password changed successfully',
    });
});

/**
 * @desc    Upload avatar
 * @route   POST /api/users/avatar
 * @access  Private
 */
export const uploadAvatar = asyncHandler(async (req, res) => {
    if (!req.file) {
        return res.status(400).json({
            success: false,
            message: 'No file uploaded',
        });
    }

    const avatarUrl = `/uploads/${req.file.filename}`;

    const user = await User.findByIdAndUpdate(
        req.user._id,
        { avatar: avatarUrl },
        { new: true }
    );

    res.json({
        success: true,
        message: 'Avatar uploaded successfully',
        avatarUrl,
        user,
    });
});

/**
 * @desc    Get all users (Admin)
 * @route   GET /api/users
 * @access  Private (Admin)
 */
export const getAllUsers = asyncHandler(async (req, res) => {
    const { role, isActive, search } = req.query;

    const query = {};

    if (role) query.role = role;
    if (isActive !== undefined) query.isActive = isActive === 'true';
    if (search) {
        query.$or = [
            { name: { $regex: search, $options: 'i' } },
            { email: { $regex: search, $options: 'i' } },
        ];
    }

    const users = await User.find(query)
        .select('-password -refreshToken')
        .sort({ createdAt: -1 });

    res.json({
        success: true,
        count: users.length,
        users,
    });
});

/**
 * @desc    Get user by ID (Admin)
 * @route   GET /api/users/:id
 * @access  Private (Admin)
 */
export const getUserById = asyncHandler(async (req, res) => {
    const user = await User.findById(req.params.id).select('-password -refreshToken');

    if (!user) {
        return res.status(404).json({
            success: false,
            message: 'User not found',
        });
    }

    // Get user statistics
    const totalTasks = await Task.countDocuments({ assignedTo: user._id });
    const completedTasks = await Task.countDocuments({
        assignedTo: user._id,
        status: 'completed'
    });
    const projects = await Project.countDocuments({
        $or: [
            { owner: user._id },
            { 'members.user': user._id },
        ],
    });

    res.json({
        success: true,
        user: {
            ...user.toObject(),
            stats: {
                totalTasks,
                completedTasks,
                projects,
                completionRate: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0,
            },
        },
    });
});

/**
 * @desc    Update user role (Admin)
 * @route   PUT /api/users/:id/role
 * @access  Private (Admin)
 */
export const updateUserRole = asyncHandler(async (req, res) => {
    const { role } = req.body;

    const user = await User.findByIdAndUpdate(
        req.params.id,
        { role },
        { new: true }
    ).select('-password -refreshToken');

    if (!user) {
        return res.status(404).json({
            success: false,
            message: 'User not found',
        });
    }

    // Log activity
    await ActivityLog.create({
        user: req.user._id,
        action: 'settings_changed',
        description: `Changed user role to ${role}`,
        metadata: { targetUser: user._id, newRole: role },
    });

    res.json({
        success: true,
        message: 'User role updated',
        user,
    });
});

/**
 * @desc    Toggle user active status (Admin)
 * @route   PUT /api/users/:id/toggle-active
 * @access  Private (Admin)
 */
export const toggleUserActive = asyncHandler(async (req, res) => {
    const user = await User.findById(req.params.id);

    if (!user) {
        return res.status(404).json({
            success: false,
            message: 'User not found',
        });
    }

    user.isActive = !user.isActive;
    await user.save();

    // Log activity
    await ActivityLog.create({
        user: req.user._id,
        action: 'settings_changed',
        description: `${user.isActive ? 'Activated' : 'Deactivated'} user account`,
        metadata: { targetUser: user._id },
    });

    res.json({
        success: true,
        message: `User ${user.isActive ? 'activated' : 'deactivated'} successfully`,
        user,
    });
});

/**
 * @desc    Delete user (Admin)
 * @route   DELETE /api/users/:id
 * @access  Private (Admin)
 */
export const deleteUser = asyncHandler(async (req, res) => {
    const user = await User.findById(req.params.id);

    if (!user) {
        return res.status(404).json({
            success: false,
            message: 'User not found',
        });
    }

    // Can't delete yourself
    if (user._id.toString() === req.user._id.toString()) {
        return res.status(400).json({
            success: false,
            message: 'Cannot delete your own account',
        });
    }

    await user.deleteOne();

    res.json({
        success: true,
        message: 'User deleted successfully',
    });
});

/**
 * @desc    Get user activity logs
 * @route   GET /api/users/:id/activity
 * @access  Private
 */
export const getUserActivity = asyncHandler(async (req, res) => {
    const { limit = 20 } = req.query;

    const activities = await ActivityLog.find({ user: req.params.id })
        .populate('relatedTask', 'title')
        .populate('relatedProject', 'name')
        .sort({ createdAt: -1 })
        .limit(parseInt(limit));

    res.json({
        success: true,
        count: activities.length,
        activities,
    });
});

/**
 * @desc    Get system statistics (Admin)
 * @route   GET /api/users/system-stats
 * @access  Private (Admin)
 */
export const getSystemStats = asyncHandler(async (req, res) => {
    const totalUsers = await User.countDocuments();
    const activeUsers = await User.countDocuments({ isActive: true });
    const adminUsers = await User.countDocuments({ role: 'admin' });

    res.json({
        success: true,
        stats: {
            totalUsers,
            activeUsers,
            adminUsers,
        },
    });
});

/**
 * @desc    Get users for chat
 * @route   GET /api/users/chat-users
 * @access  Private
 */
export const getUsersForChat = asyncHandler(async (req, res) => {
    const { search } = req.query;

    const query = {
        isActive: true,
        _id: { $ne: req.user._id }, // Exclude current user
    };

    if (search) {
        query.$or = [
            { name: { $regex: search, $options: 'i' } },
            { email: { $regex: search, $options: 'i' } },
        ];
    }

    const users = await User.find(query)
        .select('_id name email avatar role')
        .sort({ name: 1 });

    res.json({
        success: true,
        count: users.length,
        users,
    });
});
