import Task from '../models/Task.js';
import Notification from '../models/Notification.js';
import User from '../models/User.js';

/**
 * Check tasks for upcoming deadlines and send reminder notifications
 * This function runs periodically via cron job
 */
export const checkDeadlines = async (io) => {
    try {
        const now = new Date();

        // Define reminder intervals (in milliseconds)
        const reminderIntervals = [
            { type: '24h', hours: 24, milliseconds: 24 * 60 * 60 * 1000 },
            { type: '3h', hours: 3, milliseconds: 3 * 60 * 60 * 1000 },
            { type: '1h', hours: 1, milliseconds: 1 * 60 * 60 * 1000 },
        ];

        // Find all tasks that are not completed and have a due date
        const tasks = await Task.find({
            status: { $in: ['todo', 'in-progress', 'review'] },
            dueDate: { $exists: true, $ne: null, $gt: now },
            isArchived: false,
        })
            .populate('assignedTo', 'name email')
            .populate('createdBy', 'name email')
            .populate('project', 'name');

        let remindersSent = 0;

        for (const task of tasks) {
            const timeUntilDue = task.dueDate - now;

            // Check each reminder interval
            for (const interval of reminderIntervals) {
                // Check if we're within the reminder window (±15 minutes for flexibility)
                const windowMargin = 15 * 60 * 1000; // 15 minutes
                const isInWindow =
                    timeUntilDue <= interval.milliseconds + windowMargin &&
                    timeUntilDue >= interval.milliseconds - windowMargin;

                if (isInWindow) {
                    // Check if this reminder was already sent
                    const alreadySent = task.remindersSent?.some(
                        reminder => reminder.type === interval.type
                    );

                    if (!alreadySent && task.assignedTo) {
                        // Send notification
                        await sendDeadlineReminder(task, interval, io);

                        // Mark reminder as sent
                        if (!task.remindersSent) {
                            task.remindersSent = [];
                        }
                        task.remindersSent.push({
                            type: interval.type,
                            sentAt: now,
                        });
                        await task.save();

                        remindersSent++;
                    }
                }
            }

            // Check for overdue tasks
            if (timeUntilDue < 0) {
                const alreadySentOverdue = task.remindersSent?.some(
                    reminder => reminder.type === 'overdue'
                );

                if (!alreadySentOverdue && task.assignedTo) {
                    await sendOverdueNotification(task, io);

                    // Mark overdue reminder as sent
                    if (!task.remindersSent) {
                        task.remindersSent = [];
                    }
                    task.remindersSent.push({
                        type: 'overdue',
                        sentAt: now,
                    });
                    await task.save();

                    remindersSent++;
                }
            }
        }

        console.log(`✅ Deadline check completed. Sent ${remindersSent} reminders.`);
        return remindersSent;

    } catch (error) {
        console.error('❌ Error checking deadlines:', error);
        throw error;
    }
};

/**
 * Send deadline reminder notification
 */
const sendDeadlineReminder = async (task, interval, io) => {
    try {
        const message = `Task "${task.title}" is due in ${interval.hours} hour${interval.hours > 1 ? 's' : ''}!`;

        // Create notification
        const notification = await Notification.create({
            recipient: task.assignedTo._id,
            sender: task.createdBy?._id,
            type: 'task_due_soon',
            title: '⏰ Task Deadline Reminder',
            message,
            link: `/tasks/${task._id}`,
            relatedTask: task._id,
            relatedProject: task.project?._id,
        });

        await notification.populate('sender', 'name avatar');

        // Send real-time notification via Socket.IO
        if (io) {
            const activeUsers = io.activeUsers || new Map();
            const recipientSocketId = activeUsers.get(task.assignedTo._id.toString());

            if (recipientSocketId) {
                io.to(recipientSocketId).emit('notification:new', {
                    ...notification.toObject(),
                    type: 'task_due_soon',
                    title: '⏰ Task Deadline Reminder',
                    message,
                    link: `/tasks/${task._id}`,
                });
            }
        }

        console.log(`📨 Sent ${interval.type} reminder for task: ${task.title} to ${task.assignedTo.name}`);

    } catch (error) {
        console.error('Error sending deadline reminder:', error);
    }
};

/**
 * Send overdue task notification
 */
const sendOverdueNotification = async (task, io) => {
    try {
        const hoursOverdue = Math.floor((new Date() - task.dueDate) / (1000 * 60 * 60));
        const message = `Task "${task.title}" is now ${hoursOverdue} hour${hoursOverdue > 1 ? 's' : ''} overdue!`;

        // Create notification
        const notification = await Notification.create({
            recipient: task.assignedTo._id,
            sender: task.createdBy?._id,
            type: 'task_overdue',
            title: '🚨 Task Overdue',
            message,
            link: `/tasks/${task._id}`,
            relatedTask: task._id,
            relatedProject: task.project?._id,
        });

        await notification.populate('sender', 'name avatar');

        // Send real-time notification via Socket.IO
        if (io) {
            const activeUsers = io.activeUsers || new Map();
            const recipientSocketId = activeUsers.get(task.assignedTo._id.toString());

            if (recipientSocketId) {
                io.to(recipientSocketId).emit('notification:new', {
                    ...notification.toObject(),
                    type: 'task_overdue',
                    title: '🚨 Task Overdue',
                    message,
                    link: `/tasks/${task._id}`,
                });
            }
        }

        console.log(`🚨 Sent overdue notification for task: ${task.title} to ${task.assignedTo.name}`);

    } catch (error) {
        console.error('Error sending overdue notification:', error);
    }
};

/**
 * Manually trigger deadline check (useful for testing)
 */
export const triggerDeadlineCheck = async (io) => {
    console.log('🔔 Manually triggering deadline check...');
    return await checkDeadlines(io);
};
