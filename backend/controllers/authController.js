import User from '../models/User.js';
import { generateToken, generateRefreshToken, verifyRefreshToken } from '../utils/jwt.js';
import { sendOTPEmail, sendPasswordResetEmail } from '../utils/email.js';
import { asyncHandler } from '../middleware/error.js';
import crypto from 'crypto';

/**
 * @desc    Register new user
 * @route   POST /api/auth/register
 * @access  Public
 */
export const register = asyncHandler(async (req, res) => {
    const { name, email, password } = req.body;

    // Check if user exists
    const userExists = await User.findOne({ email });
    if (userExists) {
        return res.status(400).json({
            success: false,
            message: 'User already exists with this email',
        });
    }

    // Create user
    let role = "user"; // default role

    // ⭐ ADMIN AUTO ASSIGN
    if (email === process.env.ADMIN_EMAIL) {
        role = "admin";
    }

    const user = await User.create({
        name,
        email,
        password: password,
        role,
        isEmailVerified: false,
    });

    // Generate OTP
    const otp = user.generateOTP();
    await user.save();

    // Send OTP email
    try {
        await sendOTPEmail(email, name, otp);
    } catch (error) {
        console.error('Error sending OTP email:', error);
    }

    res.status(201).json({
        success: true,
        message: 'Registration successful. Please check your email for OTP verification.',
        userId: user._id,
    });
});

/**
 * @desc    Verify email OTP
 * @route   POST /api/auth/verify-otp
 * @access  Public
 */
export const verifyOTP = asyncHandler(async (req, res) => {
    const { userId, otp } = req.body;

    const user = await User.findById(userId).select('+emailVerificationOTP +emailVerificationExpires');

    if (!user) {
        return res.status(404).json({
            success: false,
            message: 'User not found',
        });
    }

    if (user.isEmailVerified) {
        return res.status(400).json({
            success: false,
            message: 'Email already verified',
        });
    }

    // Check if OTP is valid
    if (user.emailVerificationOTP !== otp) {
        return res.status(400).json({
            success: false,
            message: 'Invalid OTP',
        });
    }

    // Check if OTP is expired
    if (user.emailVerificationExpires < Date.now()) {
        return res.status(400).json({
            success: false,
            message: 'OTP has expired. Please request a new one.',
        });
    }

    // Verify email
    user.isEmailVerified = true;
    user.emailVerificationOTP = undefined;
    user.emailVerificationExpires = undefined;
    await user.save();

    res.json({
        success: true,
        message: 'Email verified successfully',
    });
});

/**
 * @desc    Resend OTP
 * @route   POST /api/auth/resend-otp
 * @access  Public
 */
export const resendOTP = asyncHandler(async (req, res) => {
    const { userId } = req.body;

    const user = await User.findById(userId);

    if (!user) {
        return res.status(404).json({
            success: false,
            message: 'User not found',
        });
    }

    if (user.isEmailVerified) {
        return res.status(400).json({
            success: false,
            message: 'Email already verified',
        });
    }

    // Generate new OTP
    const otp = user.generateOTP();
    await user.save();

    // Send OTP email
    try {
        await sendOTPEmail(user.email, user.name, otp);
    } catch (error) {
        console.error('Error sending OTP email:', error);
    }

    res.json({
        success: true,
        message: 'OTP sent successfully',
    });
});

/**
 * @desc    Login user
 * @route   POST /api/auth/login
 * @access  Public
 */
export const login = asyncHandler(async (req, res) => {
    const { email, password } = req.body;

    // Check for user
    const user = await User.findOne({ email }).select('+password');

    if (!user) {
        return res.status(401).json({
            success: false,
            message: 'Invalid credentials',
        });
    }

    // Check if email is verified
    if (!user.isEmailVerified) {
        return res.status(401).json({
            success: false,
            message: 'Please verify your email before logging in',
            userId: user._id,
        });
    }

    // Check if account is active
    if (!user.isActive) {
        return res.status(401).json({
            success: false,
            message: 'Your account has been deactivated. Please contact support.',
        });
    }

    // Check password
    const isMatch = await user.comparePassword(password);

    if (!isMatch) {
        return res.status(401).json({
            success: false,
            message: 'Invalid credentials',
        });
    }

    // Generate tokens
    const accessToken = generateToken(user._id);
    const refreshToken = generateRefreshToken(user._id);

    // Save refresh token
    user.refreshToken = refreshToken;
    user.lastActive = Date.now();
    await user.save();

    // Remove password from response
    user.password = undefined;

    res.json({
        success: true,
        message: 'Login successful',
        user,
        accessToken,
        refreshToken,
    });
});

/**
 * @desc    Refresh access token
 * @route   POST /api/auth/refresh-token
 * @access  Public
 */
export const refreshToken = asyncHandler(async (req, res) => {
    const { refreshToken } = req.body;

    if (!refreshToken) {
        return res.status(401).json({
            success: false,
            message: 'Refresh token required',
        });
    }

    // Verify refresh token
    const decoded = verifyRefreshToken(refreshToken);

    if (!decoded) {
        return res.status(401).json({
            success: false,
            message: 'Invalid refresh token',
        });
    }

    // Check if user exists and token matches
    const user = await User.findById(decoded.id).select('+refreshToken');

    if (!user || user.refreshToken !== refreshToken) {
        return res.status(401).json({
            success: false,
            message: 'Invalid refresh token',
        });
    }

    // Generate new access token
    const accessToken = generateToken(user._id);

    res.json({
        success: true,
        accessToken,
    });
});

/**
 * @desc    Forgot password
 * @route   POST /api/auth/forgot-password
 * @access  Public
 */
export const forgotPassword = asyncHandler(async (req, res) => {
    const { email } = req.body;

    const user = await User.findOne({ email });

    if (!user) {
        return res.status(404).json({
            success: false,
            message: 'No user found with this email',
        });
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    user.passwordResetToken = crypto.createHash('sha256').update(resetToken).digest('hex');
    user.passwordResetExpires = Date.now() + 60 * 60 * 1000; // 1 hour
    await user.save();

    // Send reset email
    try {
        await sendPasswordResetEmail(user.email, user.name, resetToken);
    } catch (error) {
        user.passwordResetToken = undefined;
        user.passwordResetExpires = undefined;
        await user.save();

        return res.status(500).json({
            success: false,
            message: 'Error sending password reset email',
        });
    }

    res.json({
        success: true,
        message: 'Password reset email sent',
    });
});

/**
 * @desc    Reset password
 * @route   POST /api/auth/reset-password
 * @access  Public
 */
export const resetPassword = asyncHandler(async (req, res) => {
    const { token, newPassword } = req.body;

    // Hash token
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    const user = await User.findOne({
        passwordResetToken: hashedToken,
        passwordResetExpires: { $gt: Date.now() },
    });

    if (!user) {
        return res.status(400).json({
            success: false,
            message: 'Invalid or expired reset token',
        });
    }

    // Set new password
    user.password = newPassword;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save();

    res.json({
        success: true,
        message: 'Password reset successful',
    });
});

/**
 * @desc    Logout user
 * @route   POST /api/auth/logout
 * @access  Private
 */
export const logout = asyncHandler(async (req, res) => {
    // Clear refresh token
    req.user.refreshToken = undefined;
    await req.user.save();

    res.json({
        success: true,
        message: 'Logout successful',
    });
});

/**
 * @desc    Get current user
 * @route   GET /api/auth/me
 * @access  Private
 */
export const getMe = asyncHandler(async (req, res) => {
    res.json({
        success: true,
        user: req.user,
    });
});
