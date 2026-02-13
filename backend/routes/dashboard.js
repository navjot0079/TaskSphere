import express from 'express';
import {
    getDashboardStats,
    getActivityFeed,
    getChartData,
    getAISuggestions,
    getUpcomingTasks,
    getOverdueTasks,
    getTeamPerformance,
} from '../controllers/dashboardController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

// All routes are protected
router.use(protect);

router.get('/stats', getDashboardStats);
router.get('/activity', getActivityFeed);
router.get('/charts', getChartData);
router.get('/suggestions', getAISuggestions);
router.get('/upcoming', getUpcomingTasks);
router.get('/overdue', getOverdueTasks);
router.get('/team-performance', authorize('manager', 'admin'), getTeamPerformance);

export default router;
