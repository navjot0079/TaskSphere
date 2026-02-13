import express from 'express';
import { body } from 'express-validator';
import {
    getProfile,
    updateProfile,
    updateNotificationSettings,
    changePassword,
    uploadAvatar,
    getAllUsers,
    getUserById,
    updateUserRole,
    toggleUserActive,
    deleteUser,
    getUserActivity,
    getSystemStats,
    getUsersForChat,
} from '../controllers/userController.js';
import { protect, authorize } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import upload from '../middleware/upload.js';

const router = express.Router();

// All routes are protected
router.use(protect);

// Current user routes
router.get('/profile', getProfile);
router.put('/profile', updateProfile);
router.put('/notification-settings', updateNotificationSettings);
router.put(
    '/change-password',
    [
        body('currentPassword').notEmpty().withMessage('Current password is required'),
        body('newPassword').isLength({ min: 6 }).withMessage('New password must be at least 6 characters'),
    ],
    validate,
    changePassword
);
router.post('/avatar', upload.single('avatar'), uploadAvatar);

// Chat routes
router.get('/chat-users', getUsersForChat);

// Admin routes
router.get('/system-stats', authorize('admin'), getSystemStats);
router.get('/', authorize('admin'), getAllUsers);
router.get('/:id', getUserById);
router.put('/:id/role', authorize('admin'), updateUserRole);
router.put('/:id/toggle-active', authorize('admin'), toggleUserActive);
router.delete('/:id', authorize('admin'), deleteUser);
router.get('/:id/activity', getUserActivity);

export default router;
