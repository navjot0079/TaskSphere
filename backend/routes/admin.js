import express from 'express';
import { protect, authorize } from '../middleware/auth.js';
import { triggerDeadlineCheck } from '../utils/deadlineReminder.js';

const router = express.Router();

/**
 * @desc    Manually trigger deadline check (for testing)
 * @route   POST /api/admin/trigger-deadline-check
 * @access  Admin only
 */
router.post('/trigger-deadline-check', protect, authorize('admin'), async (req, res) => {
    try {
        const remindersSent = await triggerDeadlineCheck(req.app.get('io'));

        res.json({
            success: true,
            message: 'Deadline check completed',
            remindersSent,
        });
    } catch (error) {
        console.error('Error triggering deadline check:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to trigger deadline check',
            error: error.message,
        });
    }
});

export default router;
