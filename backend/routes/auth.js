import express from 'express';
import { body } from 'express-validator';
import {
    register,
    verifyOTP,
    resendOTP,
    login,
    refreshToken,
    forgotPassword,
    resetPassword,
    logout,
    getMe,
} from '../controllers/authController.js';
import { protect } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';

const router = express.Router();

// Public routes
router.post(
    '/register',
    [
        body('name').trim().notEmpty().withMessage('Name is required'),
        body('email').isEmail().withMessage('Valid email is required'),
        body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    ],
    validate,
    register
);

router.post(
    '/verify-otp',
    [
        body('userId').notEmpty().withMessage('User ID is required'),
        body('otp').notEmpty().withMessage('OTP is required'),
    ],
    validate,
    verifyOTP
);

router.post(
    '/resend-otp',
    [body('userId').notEmpty().withMessage('User ID is required')],
    validate,
    resendOTP
);

router.post(
    '/login',
    [
        body('email').isEmail().withMessage('Valid email is required'),
        body('password').notEmpty().withMessage('Password is required'),
    ],
    validate,
    login
);

router.post(
    '/refresh-token',
    [body('refreshToken').notEmpty().withMessage('Refresh token is required')],
    validate,
    refreshToken
);

router.post(
    '/forgot-password',
    [body('email').isEmail().withMessage('Valid email is required')],
    validate,
    forgotPassword
);

router.post(
    '/reset-password',
    [
        body('token').notEmpty().withMessage('Reset token is required'),
        body('newPassword').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    ],
    validate,
    resetPassword
);

// Protected routes
router.post('/logout', protect, logout);
router.get('/me', protect, getMe);

export default router;
