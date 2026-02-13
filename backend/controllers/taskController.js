import Task from '../models/Task.js';
import User from '../models/User.js';
import Project from '../models/Project.js';
import Notification from '../models/Notification.js';
import ActivityLog from '../models/ActivityLog.js';
import { asyncHandler } from '../middleware/error.js';
import { sendTaskAssignmentEmail } from '../utils/email.js';

/**
 * @desc    Get all tasks
 * @route   GET /api/tasks
 * @access  Private
 */
export const getTasks = asyncHandler(async (req, res) => {
    const {
        status,
        priority,
        project,
        assignedTo,
        search,
        sortBy = 'createdAt',
        order = 'desc',
        page = 1,
        limit = 50,
    } = req.query;

    // Build query
    const query = {};

    // Role-based filtering
    if (req.user.role === 'user') {
        query.$or = [
            { assignedTo: req.user._id },
            { createdBy: req.user._id },
        ];
    } else if (req.user.role === 'manager') {
        // Managers can see tasks in their projects
        const userProjects = await Project.find({
            $or: [
                { owner: req.user._id },
                { 'members.user': req.user._id },
            ],
        }).select('_id');

        query.$or = [
            { assignedTo: req.user._id },
            { createdBy: req.user._id },
            { project: { $in: userProjects.map(p => p._id) } },
        ];
    }
    // Admins can see all tasks

    if (status) query.status = status;
    if (priority) query.priority = priority;
    if (project) query.project = project;
    if (assignedTo) query.assignedTo = assignedTo;
    if (search) {
        query.$or = [
            { title: { $regex: search, $options: 'i' } },
            { description: { $regex: search, $options: 'i' } },
        ];
    }

    // Get tasks
    const tasks = await Task.find(query)
        .populate('assignedTo', 'name email avatar')
        .populate('createdBy', 'name email avatar')
        .populate('project', 'name color')
        .sort({ [sortBy]: order === 'desc' ? -1 : 1 })
        .limit(limit * 1)
        .skip((page - 1) * limit);

    const total = await Task.countDocuments(query);

    res.json({
        success: true,
        count: tasks.length,
        total,
        pages: Math.ceil(total / limit),
        currentPage: parseInt(page),
        tasks,
    });
});

/**
 * @desc    Get single task
 * @route   GET /api/tasks/:id
 * @access  Private
 */
export const getTask = asyncHandler(async (req, res) => {
    const task = await Task.findById(req.params.id)
        .populate('assignedTo', 'name email avatar')
        .populate('createdBy', 'name email avatar')
        .populate('project', 'name color')
        .populate('subtasks.completedBy', 'name avatar')
        .populate('attachments.uploadedBy', 'name avatar')
        .populate('timeTracking.sessions.user', 'name avatar');

    if (!task) {
        return res.status(404).json({
            success: false,
            message: 'Task not found',
        });
    }

    res.json({
        success: true,
        task,
    });
});

/**
 * @desc    Create new task
 * @route   POST /api/tasks
 * @access  Private
 */
export const createTask = asyncHandler(async (req, res) => {
    const taskData = {
        ...req.body,
        createdBy: req.user._id,
    };

    const task = await Task.create(taskData);

    // Populate task
    await task.populate('assignedTo', 'name email avatar');
    await task.populate('createdBy', 'name email avatar');
    await task.populate('project', 'name color');

    // Create notification if assigned to someone
    if (task.assignedTo && task.assignedTo._id.toString() !== req.user._id.toString()) {
        const notification = await Notification.create({
            recipient: task.assignedTo._id,
            sender: req.user._id,
            type: 'task_assigned',
            title: 'New Task Assigned',
            message: `${req.user.name} assigned you a task: ${task.title}`,
            link: `/tasks/${task._id}`,
            relatedTask: task._id,
        });

        // Emit real-time notification via Socket.io
        const io = req.app.get('io');
        if (io) {
            io.to(`user:${task.assignedTo._id}`).emit('notification:new', {
                ...notification.toObject(),
                sender: { _id: req.user._id, name: req.user.name, avatar: req.user.avatar },
            });
        }

        // Send email notification
        try {
            await sendTaskAssignmentEmail(
                task.assignedTo.email,
                task.assignedTo.name,
                task.title,
                req.user.name
            );
        } catch (error) {
            console.error('Error sending task assignment email:', error);
        }
    }

    // Log activity
    await ActivityLog.create({
        user: req.user._id,
        action: 'task_created',
        description: `Created task: ${task.title}`,
        relatedTask: task._id,
    });

    res.status(201).json({
        success: true,
        message: 'Task created successfully',
        task,
    });
});

/**
 * @desc    Update task
 * @route   PUT /api/tasks/:id
 * @access  Private
 */
export const updateTask = asyncHandler(async (req, res) => {
    let task = await Task.findById(req.params.id);

    if (!task) {
        return res.status(404).json({
            success: false,
            message: 'Task not found',
        });
    }

    // Check permissions
    const canUpdate =
        req.user.role === 'admin' ||
        task.createdBy.toString() === req.user._id.toString() ||
        task.assignedTo?.toString() === req.user._id.toString();

    if (!canUpdate) {
        return res.status(403).json({
            success: false,
            message: 'Not authorized to update this task',
        });
    }

    // Check if assigned user changed
    const oldAssignedTo = task.assignedTo?.toString();
    const newAssignedTo = req.body.assignedTo;
    const oldStatus = task.status;

    task = await Task.findByIdAndUpdate(req.params.id, req.body, {
        new: true,
        runValidators: true,
    })
        .populate('assignedTo', 'name email avatar')
        .populate('createdBy', 'name email avatar')
        .populate('project', 'name color');

    // Send notification if assignment changed
    if (newAssignedTo && oldAssignedTo !== newAssignedTo) {
        const notification = await Notification.create({
            recipient: newAssignedTo,
            sender: req.user._id,
            type: 'task_assigned',
            title: 'Task Reassigned',
            message: `${req.user.name} assigned you a task: ${task.title}`,
            link: `/tasks/${task._id}`,
            relatedTask: task._id,
        });

        // Emit real-time notification
        const io = req.app.get('io');
        if (io) {
            io.to(`user:${newAssignedTo}`).emit('notification:new', {
                ...notification.toObject(),
                sender: { _id: req.user._id, name: req.user.name, avatar: req.user.avatar },
            });
        }
    }

    // Send notification if task completed
    if (req.body.status === 'completed' && oldStatus !== 'completed') {
        const recipientId = task.createdBy._id.toString() !== req.user._id.toString()
            ? task.createdBy._id
            : task.assignedTo?._id;

        if (recipientId) {
            const notification = await Notification.create({
                recipient: recipientId,
                sender: req.user._id,
                type: 'task_completed',
                title: 'Task Completed',
                message: `${req.user.name} marked task "${task.title}" as completed`,
                link: `/tasks/${task._id}`,
                relatedTask: task._id,
            });

            // Emit real-time notification
            const io = req.app.get('io');
            if (io) {
                io.to(`user:${recipientId}`).emit('notification:new', {
                    ...notification.toObject(),
                    sender: { _id: req.user._id, name: req.user.name, avatar: req.user.avatar },
                });
            }
        }
    }

    // Log activity
    await ActivityLog.create({
        user: req.user._id,
        action: 'task_updated',
        description: `Updated task: ${task.title}`,
        relatedTask: task._id,
    });

    res.json({
        success: true,
        message: 'Task updated successfully',
        task,
    });
});

/**
 * @desc    Delete task
 * @route   DELETE /api/tasks/:id
 * @access  Private
 */
export const deleteTask = asyncHandler(async (req, res) => {
    const task = await Task.findById(req.params.id);

    if (!task) {
        return res.status(404).json({
            success: false,
            message: 'Task not found',
        });
    }

    // Check permissions - only admin or task creator can delete
    const canDelete =
        req.user.role === 'admin' ||
        task.createdBy.toString() === req.user._id.toString();

    if (!canDelete) {
        return res.status(403).json({
            success: false,
            message: 'Not authorized to delete this task',
        });
    }

    // Only allow deletion of completed tasks
    if (task.status !== 'completed') {
        return res.status(400).json({
            success: false,
            message: 'Only completed tasks can be deleted',
        });
    }

    await task.deleteOne();

    // Log activity
    await ActivityLog.create({
        user: req.user._id,
        action: 'task_deleted',
        description: `Deleted task: ${task.title}`,
    });

    res.json({
        success: true,
        message: 'Task deleted successfully',
    });
});

/**
 * @desc    Add subtask
 * @route   POST /api/tasks/:id/subtasks
 * @access  Private
 */
export const addSubtask = asyncHandler(async (req, res) => {
    const task = await Task.findById(req.params.id);

    if (!task) {
        return res.status(404).json({
            success: false,
            message: 'Task not found',
        });
    }

    task.subtasks.push(req.body);
    await task.save();

    res.json({
        success: true,
        message: 'Subtask added successfully',
        task,
    });
});

/**
 * @desc    Update subtask
 * @route   PUT /api/tasks/:id/subtasks/:subtaskId
 * @access  Private
 */
export const updateSubtask = asyncHandler(async (req, res) => {
    const task = await Task.findById(req.params.id);

    if (!task) {
        return res.status(404).json({
            success: false,
            message: 'Task not found',
        });
    }

    const subtask = task.subtasks.id(req.params.subtaskId);

    if (!subtask) {
        return res.status(404).json({
            success: false,
            message: 'Subtask not found',
        });
    }

    Object.assign(subtask, req.body);

    if (req.body.completed && !subtask.completedBy) {
        subtask.completedBy = req.user._id;
        subtask.completedAt = Date.now();
    }

    await task.save();

    res.json({
        success: true,
        message: 'Subtask updated successfully',
        task,
    });
});

/**
 * @desc    Start time tracking
 * @route   POST /api/tasks/:id/time-tracking/start
 * @access  Private
 */
export const startTimeTracking = asyncHandler(async (req, res) => {
    const task = await Task.findById(req.params.id);

    if (!task) {
        return res.status(404).json({
            success: false,
            message: 'Task not found',
        });
    }

    task.timeTracking.sessions.push({
        startTime: Date.now(),
        user: req.user._id,
    });

    await task.save();

    res.json({
        success: true,
        message: 'Time tracking started',
        sessionId: task.timeTracking.sessions[task.timeTracking.sessions.length - 1]._id,
    });
});

/**
 * @desc    Stop time tracking
 * @route   POST /api/tasks/:id/time-tracking/stop
 * @access  Private
 */
export const stopTimeTracking = asyncHandler(async (req, res) => {
    const task = await Task.findById(req.params.id);

    if (!task) {
        return res.status(404).json({
            success: false,
            message: 'Task not found',
        });
    }

    const { sessionId } = req.body;
    const session = task.timeTracking.sessions.id(sessionId);

    if (!session) {
        return res.status(404).json({
            success: false,
            message: 'Time tracking session not found',
        });
    }

    session.endTime = Date.now();
    session.duration = Math.round((session.endTime - session.startTime) / 60000); // minutes

    // Update logged hours
    task.timeTracking.loggedHours += session.duration / 60;

    await task.save();

    res.json({
        success: true,
        message: 'Time tracking stopped',
        duration: session.duration,
    });
});

/**
 * @desc    Get task statistics
 * @route   GET /api/tasks/stats
 * @access  Private
 */
export const getTaskStats = asyncHandler(async (req, res) => {
    const query = req.user.role === 'user'
        ? { assignedTo: req.user._id }
        : {};

    const stats = await Task.aggregate([
        { $match: query },
        {
            $group: {
                _id: '$status',
                count: { $sum: 1 },
            },
        },
    ]);

    const overdue = await Task.countDocuments({
        ...query,
        dueDate: { $lt: new Date() },
        status: { $ne: 'completed' },
    });

    res.json({
        success: true,
        stats,
        overdue,
    });
});
