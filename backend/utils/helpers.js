/**
 * Calculate productivity score based on user's task completion rate
 */
export const calculateProductivityScore = (user, tasks) => {
    if (tasks.length === 0) return 0;

    const completed = tasks.filter(t => t.status === 'completed').length;
    const onTime = tasks.filter(t =>
        t.status === 'completed' &&
        t.completedDate &&
        t.dueDate &&
        new Date(t.completedDate) <= new Date(t.dueDate)
    ).length;

    const completionRate = (completed / tasks.length) * 100;
    const onTimeRate = completed > 0 ? (onTime / completed) * 100 : 0;

    // Weighted score: 60% completion rate + 40% on-time rate
    const score = Math.round((completionRate * 0.6) + (onTimeRate * 0.4));

    return Math.min(score, 100);
};

/**
 * Get AI-powered task suggestions
 */
export const getAITaskSuggestions = (userTasks, userProjects) => {
    const suggestions = [];

    // Analyze patterns
    const highPriorityCount = userTasks.filter(t => t.priority === 'high' || t.priority === 'urgent').length;
    const overdueCount = userTasks.filter(t => t.dueDate && new Date(t.dueDate) < new Date() && t.status !== 'completed').length;
    const activeProjects = userProjects.filter(p => p.status === 'active').length;

    // Generate suggestions based on patterns
    if (overdueCount > 3) {
        suggestions.push({
            type: 'warning',
            title: 'Multiple Overdue Tasks',
            message: `You have ${overdueCount} overdue tasks. Consider rescheduling or delegating some tasks.`,
            action: 'View Overdue Tasks',
        });
    }

    if (highPriorityCount > 5) {
        suggestions.push({
            type: 'tip',
            title: 'Too Many High Priority Tasks',
            message: 'Consider re-evaluating priorities. Not everything can be urgent.',
            action: 'Review Priorities',
        });
    }

    if (activeProjects > 10) {
        suggestions.push({
            type: 'info',
            title: 'Managing Many Projects',
            message: 'You\'re managing many active projects. Consider archiving completed ones.',
            action: 'Manage Projects',
        });
    }

    // Productivity tips
    const productivityTips = [
        {
            type: 'tip',
            title: 'Use Time Blocking',
            message: 'Allocate specific time blocks for different types of tasks to improve focus.',
            action: 'Learn More',
        },
        {
            type: 'tip',
            title: 'Break Down Large Tasks',
            message: 'Split complex tasks into smaller subtasks for better progress tracking.',
            action: 'Create Subtasks',
        },
        {
            type: 'tip',
            title: 'Take Regular Breaks',
            message: 'Use the Pomodoro technique: 25 minutes work, 5 minutes break.',
            action: 'Start Pomodoro',
        },
    ];

    // Add a random productivity tip
    suggestions.push(productivityTips[Math.floor(Math.random() * productivityTips.length)]);

    return suggestions;
};

/**
 * Generate analytics data for dashboard
 */
export const generateAnalytics = (tasks, startDate, endDate) => {
    const filteredTasks = tasks.filter(t => {
        const taskDate = new Date(t.createdAt);
        return taskDate >= startDate && taskDate <= endDate;
    });

    const analytics = {
        total: filteredTasks.length,
        completed: filteredTasks.filter(t => t.status === 'completed').length,
        inProgress: filteredTasks.filter(t => t.status === 'in-progress').length,
        todo: filteredTasks.filter(t => t.status === 'todo').length,
        overdue: filteredTasks.filter(t =>
            t.dueDate &&
            new Date(t.dueDate) < new Date() &&
            t.status !== 'completed'
        ).length,
        byPriority: {
            low: filteredTasks.filter(t => t.priority === 'low').length,
            medium: filteredTasks.filter(t => t.priority === 'medium').length,
            high: filteredTasks.filter(t => t.priority === 'high').length,
            urgent: filteredTasks.filter(t => t.priority === 'urgent').length,
        },
        completionRate: filteredTasks.length > 0
            ? Math.round((filteredTasks.filter(t => t.status === 'completed').length / filteredTasks.length) * 100)
            : 0,
    };

    return analytics;
};

/**
 * Format date range for analytics
 */
export const getDateRange = (period) => {
    const now = new Date();
    let startDate, endDate = now;

    switch (period) {
        case 'today':
            startDate = new Date(now.setHours(0, 0, 0, 0));
            break;
        case 'week':
            startDate = new Date(now.setDate(now.getDate() - 7));
            break;
        case 'month':
            startDate = new Date(now.setMonth(now.getMonth() - 1));
            break;
        case 'year':
            startDate = new Date(now.setFullYear(now.getFullYear() - 1));
            break;
        default:
            startDate = new Date(now.setMonth(now.getMonth() - 1));
    }

    return { startDate, endDate };
};
