import User from '../models/User.js';
import Task from '../models/Task.js';
import Project from '../models/Project.js';
import ActivityLog from '../models/ActivityLog.js';
import { asyncHandler } from '../middleware/error.js';
import { calculateProductivityScore, getAITaskSuggestions, generateAnalytics, getDateRange } from '../utils/helpers.js';

/**
 * @desc    Get dashboard statistics
 * @route   GET /api/dashboard/stats
 * @access  Private
 */
export const getDashboardStats = asyncHandler(async (req, res) => {
    const { period = 'month' } = req.query;
    const { startDate, endDate } = getDateRange(period);

    // Build base query - admins see all tasks, others see only their tasks
    const baseQuery = req.user.role === 'admin'
        ? {}
        : {
            $or: [
                { assignedTo: req.user._id },
                { createdBy: req.user._id },
            ],
        };

    // Get user's tasks
    const tasks = await Task.find(baseQuery);

    const filteredTasks = tasks.filter(t => {
        const taskDate = new Date(t.createdAt);
        return taskDate >= startDate && taskDate <= endDate;
    });

    // Basic stats
    const stats = {
        total: filteredTasks.length,
        completed: filteredTasks.filter(t => t.status === 'completed').length,
        inProgress: filteredTasks.filter(t => t.status === 'in-progress').length,
        todo: filteredTasks.filter(t => t.status === 'todo').length,
        overdue: filteredTasks.filter(t =>
            t.dueDate &&
            new Date(t.dueDate) < new Date() &&
            t.status !== 'completed'
        ).length,
    };

    // Priority breakdown
    const byPriority = {
        low: filteredTasks.filter(t => t.priority === 'low').length,
        medium: filteredTasks.filter(t => t.priority === 'medium').length,
        high: filteredTasks.filter(t => t.priority === 'high').length,
        urgent: filteredTasks.filter(t => t.priority === 'urgent').length,
    };

    // Completion rate
    const completionRate = stats.total > 0
        ? Math.round((stats.completed / stats.total) * 100)
        : 0;

    // Productivity score
    const productivityScore = calculateProductivityScore(req.user, tasks);

    res.json({
        success: true,
        stats: {
            ...stats,
            byPriority,
            completionRate,
            productivityScore,
            period,
        },
    });
});

/**
 * @desc    Get activity feed
 * @route   GET /api/dashboard/activity
 * @access  Private
 */
export const getActivityFeed = asyncHandler(async (req, res) => {
    const { limit = 10 } = req.query;

    // Build base query - admins see all activities, others see only their activities
    const baseQuery = req.user.role === 'admin'
        ? {}
        : {
            $or: [
                { user: req.user._id },
                // Include activities from user's projects
            ],
        };

    // Get recent activity logs
    const activities = await ActivityLog.find(baseQuery)
        .populate('user', 'name avatar')
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
 * @desc    Get chart data
 * @route   GET /api/dashboard/charts
 * @access  Private
 */
export const getChartData = asyncHandler(async (req, res) => {
    const { type = 'task-completion', period = 'month' } = req.query;
    const { startDate, endDate } = getDateRange(period);

    let chartData = [];

    // Build base query - admins see all tasks, others see only their tasks
    const baseQuery = {};
    if (req.user.role !== 'admin') {
        baseQuery.assignedTo = req.user._id;
    }

    if (type === 'task-completion') {
        // Get tasks completed over time
        const tasks = await Task.find({
            ...baseQuery,
            createdAt: { $gte: startDate, $lte: endDate },
        });

        // Group by date
        const dateMap = new Map();
        tasks.forEach(task => {
            const date = new Date(task.createdAt).toLocaleDateString();
            dateMap.set(date, (dateMap.get(date) || 0) + 1);
        });

        chartData = Array.from(dateMap.entries()).map(([date, count]) => ({
            date,
            count,
        }));
    } else if (type === 'priority-distribution') {
        // Get tasks by priority
        const tasks = await Task.find({
            ...baseQuery,
            status: { $ne: 'completed' },
        });

        const priorities = ['low', 'medium', 'high', 'urgent'];
        chartData = priorities.map(priority => ({
            name: priority,
            value: tasks.filter(t => t.priority === priority).length,
        }));
    } else if (type === 'status-distribution') {
        // Get tasks by status
        const tasks = await Task.find(baseQuery);

        const statuses = ['todo', 'in-progress', 'review', 'completed'];
        chartData = statuses.map(status => ({
            name: status,
            value: tasks.filter(t => t.status === status).length,
        }));
    } else if (type === 'productivity-trend') {
        // Calculate productivity over time (last 7 days)
        const days = 7;
        chartData = [];

        for (let i = days - 1; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            date.setHours(0, 0, 0, 0);

            const nextDate = new Date(date);
            nextDate.setDate(nextDate.getDate() + 1);

            const completed = await Task.countDocuments({
                ...baseQuery,
                status: 'completed',
                completedDate: { $gte: date, $lt: nextDate },
            });

            chartData.push({
                date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                completed,
            });
        }
    }

    res.json({
        success: true,
        type,
        period,
        data: chartData,
    });
});

/**
 * @desc    Get AI task suggestions
 * @route   GET /api/dashboard/suggestions
 * @access  Private
 */
export const getAISuggestions = asyncHandler(async (req, res) => {
    const tasks = await Task.find({
        $or: [
            { assignedTo: req.user._id },
            { createdBy: req.user._id },
        ],
    });

    const projects = await Project.find({
        $or: [
            { owner: req.user._id },
            { 'members.user': req.user._id },
        ],
    });

    const suggestions = getAITaskSuggestions(tasks, projects);

    res.json({
        success: true,
        count: suggestions.length,
        suggestions,
    });
});

/**
 * @desc    Get upcoming deadlines
 * @route   GET /api/dashboard/upcoming
 * @access  Private
 */
export const getUpcomingTasks = asyncHandler(async (req, res) => {
    const { days = 7 } = req.query;

    const upcomingDate = new Date();
    upcomingDate.setDate(upcomingDate.getDate() + parseInt(days));

    const tasks = await Task.find({
        assignedTo: req.user._id,
        status: { $ne: 'completed' },
        dueDate: { $gte: new Date(), $lte: upcomingDate },
    })
        .populate('project', 'name color')
        .sort({ dueDate: 1 });

    res.json({
        success: true,
        count: tasks.length,
        tasks,
    });
});

/**
 * @desc    Get overdue tasks
 * @route   GET /api/dashboard/overdue
 * @access  Private
 */
export const getOverdueTasks = asyncHandler(async (req, res) => {
    const tasks = await Task.find({
        assignedTo: req.user._id,
        status: { $ne: 'completed' },
        dueDate: { $lt: new Date() },
    })
        .populate('project', 'name color')
        .sort({ dueDate: 1 });

    res.json({
        success: true,
        count: tasks.length,
        tasks,
    });
});

/**
 * @desc    Get team performance (Manager/Admin only)
 * @route   GET /api/dashboard/team-performance
 * @access  Private (Manager, Admin)
 */
export const getTeamPerformance = asyncHandler(async (req, res) => {
    // Get all users
    const users = await User.find({
        role: { $in: ['user', 'manager'] },
        isActive: true,
    }).select('name email avatar productivityScore');

    // Get task counts for each user
    const userStats = await Promise.all(
        users.map(async (user) => {
            const totalTasks = await Task.countDocuments({
                assignedTo: user._id,
            });

            const completedTasks = await Task.countDocuments({
                assignedTo: user._id,
                status: 'completed',
            });

            const overdueTasks = await Task.countDocuments({
                assignedTo: user._id,
                status: { $ne: 'completed' },
                dueDate: { $lt: new Date() },
            });

            return {
                user: {
                    _id: user._id,
                    name: user.name,
                    email: user.email,
                    avatar: user.avatar,
                },
                totalTasks,
                completedTasks,
                overdueTasks,
                completionRate: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0,
                productivityScore: user.productivityScore,
            };
        })
    );

    res.json({
        success: true,
        count: userStats.length,
        teamStats: userStats,
    });
});
