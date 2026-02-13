import Project from '../models/Project.js';
import Task from '../models/Task.js';
import Notification from '../models/Notification.js';
import ActivityLog from '../models/ActivityLog.js';
import { asyncHandler } from '../middleware/error.js';

/**
 * @desc    Get all projects
 * @route   GET /api/projects
 * @access  Private
 */
export const getProjects = asyncHandler(async (req, res) => {
    const { status, search, sortBy = 'createdAt', order = 'desc' } = req.query;

    // Build query based on user role
    const query = {};

    if (req.user.role === 'user' || req.user.role === 'manager') {
        query.$or = [
            { owner: req.user._id },
            { 'members.user': req.user._id },
        ];
    }
    // Admins can see all projects

    if (status) query.status = status;
    if (search) {
        query.$or = [
            { name: { $regex: search, $options: 'i' } },
            { description: { $regex: search, $options: 'i' } },
        ];
    }

    const projects = await Project.find(query)
        .populate('owner', 'name email avatar')
        .populate('members.user', 'name email avatar')
        .sort({ [sortBy]: order === 'desc' ? -1 : 1 });

    // Get task counts for each project
    const projectsWithStats = await Promise.all(
        projects.map(async (project) => {
            const totalTasks = await Task.countDocuments({ project: project._id });
            const completedTasks = await Task.countDocuments({
                project: project._id,
                status: 'completed'
            });

            return {
                ...project.toObject(),
                taskCount: totalTasks,
                completedTaskCount: completedTasks,
                progress: totalTasks === 0 ? 0 : Math.round((completedTasks / totalTasks) * 100),
            };
        })
    );

    res.json({
        success: true,
        count: projectsWithStats.length,
        projects: projectsWithStats,
    });
});

/**
 * @desc    Get single project
 * @route   GET /api/projects/:id
 * @access  Private
 */
export const getProject = asyncHandler(async (req, res) => {
    const project = await Project.findById(req.params.id)
        .populate('owner', 'name email avatar')
        .populate('members.user', 'name email avatar');

    if (!project) {
        return res.status(404).json({
            success: false,
            message: 'Project not found',
        });
    }

    // Get tasks for this project
    const tasks = await Task.find({ project: project._id })
        .populate('assignedTo', 'name email avatar')
        .sort({ createdAt: -1 });

    // Calculate statistics
    const stats = {
        totalTasks: tasks.length,
        completedTasks: tasks.filter(t => t.status === 'completed').length,
        inProgressTasks: tasks.filter(t => t.status === 'in-progress').length,
        todoTasks: tasks.filter(t => t.status === 'todo').length,
        overdueTasks: tasks.filter(t =>
            t.dueDate &&
            new Date(t.dueDate) < new Date() &&
            t.status !== 'completed'
        ).length,
    };

    res.json({
        success: true,
        project: {
            ...project.toObject(),
            tasks,
            stats,
        },
    });
});

/**
 * @desc    Create new project
 * @route   POST /api/projects
 * @access  Private (Manager, Admin)
 */
export const createProject = asyncHandler(async (req, res) => {
    const projectData = {
        ...req.body,
        owner: req.user._id,
        members: [
            {
                user: req.user._id,
                role: 'owner',
            },
        ],
    };

    const project = await Project.create(projectData);

    await project.populate('owner', 'name email avatar');
    await project.populate('members.user', 'name email avatar');

    // Log activity
    await ActivityLog.create({
        user: req.user._id,
        action: 'project_created',
        description: `Created project: ${project.name}`,
        relatedProject: project._id,
    });

    res.status(201).json({
        success: true,
        message: 'Project created successfully',
        project,
    });
});

/**
 * @desc    Update project
 * @route   PUT /api/projects/:id
 * @access  Private
 */
export const updateProject = asyncHandler(async (req, res) => {
    let project = await Project.findById(req.params.id);

    if (!project) {
        return res.status(404).json({
            success: false,
            message: 'Project not found',
        });
    }

    // Check permissions
    const isOwner = project.owner.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';
    const member = project.members.find(m => m.user.toString() === req.user._id.toString());
    const isMemberAdmin = member && member.role === 'admin';

    if (!isOwner && !isAdmin && !isMemberAdmin) {
        return res.status(403).json({
            success: false,
            message: 'Not authorized to update this project',
        });
    }

    project = await Project.findByIdAndUpdate(req.params.id, req.body, {
        new: true,
        runValidators: true,
    })
        .populate('owner', 'name email avatar')
        .populate('members.user', 'name email avatar');

    // Log activity
    await ActivityLog.create({
        user: req.user._id,
        action: 'project_updated',
        description: `Updated project: ${project.name}`,
        relatedProject: project._id,
    });

    res.json({
        success: true,
        message: 'Project updated successfully',
        project,
    });
});

/**
 * @desc    Delete project
 * @route   DELETE /api/projects/:id
 * @access  Private
 */
export const deleteProject = asyncHandler(async (req, res) => {
    const project = await Project.findById(req.params.id);

    if (!project) {
        return res.status(404).json({
            success: false,
            message: 'Project not found',
        });
    }

    // Check permissions
    const isOwner = project.owner.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';

    if (!isOwner && !isAdmin) {
        return res.status(403).json({
            success: false,
            message: 'Not authorized to delete this project',
        });
    }

    await project.deleteOne();

    // Log activity
    await ActivityLog.create({
        user: req.user._id,
        action: 'project_deleted',
        description: `Deleted project: ${project.name}`,
    });

    res.json({
        success: true,
        message: 'Project deleted successfully',
    });
});

/**
 * @desc    Invite member to project (sends notification)
 * @route   POST /api/projects/:id/invite
 * @access  Private
 */
export const inviteMember = asyncHandler(async (req, res) => {
    const project = await Project.findById(req.params.id);

    if (!project) {
        return res.status(404).json({
            success: false,
            message: 'Project not found',
        });
    }

    // Check permissions
    const isOwner = project.owner.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';

    if (!isOwner && !isAdmin) {
        return res.status(403).json({
            success: false,
            message: 'Not authorized to invite members',
        });
    }

    const { userId } = req.body;

    // Check if member already exists
    const memberExists = project.members.some(m => m.user.toString() === userId);

    if (memberExists) {
        return res.status(400).json({
            success: false,
            message: 'User is already a member of this project',
        });
    }

    // Check if invitation already sent and pending
    const pendingInvite = await Notification.findOne({
        recipient: userId,
        relatedProject: project._id,
        type: 'project_invited',
        isRead: false,
    });

    if (pendingInvite) {
        return res.status(400).json({
            success: false,
            message: 'Invitation already sent to this user',
        });
    }

    // Send notification invitation
    await Notification.create({
        recipient: userId,
        sender: req.user._id,
        type: 'project_invited',
        title: 'Project Invitation',
        message: `${req.user.name} invited you to join project: ${project.name}`,
        link: `/projects/${project._id}`,
        relatedProject: project._id,
    });

    res.json({
        success: true,
        message: 'Invitation sent successfully',
    });
});

/**
 * @desc    Accept project invitation
 * @route   POST /api/projects/:id/accept-invite
 * @access  Private
 */
export const acceptProjectInvite = asyncHandler(async (req, res) => {
    const project = await Project.findById(req.params.id);

    if (!project) {
        return res.status(404).json({
            success: false,
            message: 'Project not found',
        });
    }

    // Check if already a member
    const memberExists = project.members.some(m => m.user.toString() === req.user._id.toString());

    if (memberExists) {
        return res.status(400).json({
            success: false,
            message: 'You are already a member of this project',
        });
    }

    // Add user as member
    project.members.push({
        user: req.user._id,
        role: 'member',
    });

    await project.save();
    await project.populate('members.user', 'name email avatar');

    // Mark all project invitation notifications as read
    await Notification.updateMany(
        {
            recipient: req.user._id,
            relatedProject: project._id,
            type: 'project_invited',
            isRead: false,
        },
        {
            isRead: true,
            readAt: Date.now(),
        }
    );

    // Notify project owner
    await Notification.create({
        recipient: project.owner,
        sender: req.user._id,
        type: 'project_updated',
        title: 'Member Joined Project',
        message: `${req.user.name} accepted your invitation and joined ${project.name}`,
        link: `/projects/${project._id}`,
        relatedProject: project._id,
    });

    // Log activity
    await ActivityLog.create({
        user: req.user._id,
        action: 'user_invited',
        description: `Joined project: ${project.name}`,
        relatedProject: project._id,
    });

    res.json({
        success: true,
        message: 'Successfully joined the project',
        project,
    });
});

/**
 * @desc    Remove member from project
 * @route   DELETE /api/projects/:id/members/:userId
 * @access  Private
 */
export const removeMember = asyncHandler(async (req, res) => {
    const project = await Project.findById(req.params.id);

    if (!project) {
        return res.status(404).json({
            success: false,
            message: 'Project not found',
        });
    }

    // Can't remove owner
    if (project.owner.toString() === req.params.userId) {
        return res.status(400).json({
            success: false,
            message: 'Cannot remove project owner',
        });
    }

    project.members = project.members.filter(
        m => m.user.toString() !== req.params.userId
    );

    await project.save();

    // Log activity
    await ActivityLog.create({
        user: req.user._id,
        action: 'user_removed',
        description: `Removed member from project: ${project.name}`,
        relatedProject: project._id,
    });

    res.json({
        success: true,
        message: 'Member removed successfully',
    });
});

/**
 * @desc    Update member role
 * @route   PUT /api/projects/:id/members/:userId
 * @access  Private
 */
export const updateMemberRole = asyncHandler(async (req, res) => {
    const project = await Project.findById(req.params.id);

    if (!project) {
        return res.status(404).json({
            success: false,
            message: 'Project not found',
        });
    }

    const member = project.members.find(m => m.user.toString() === req.params.userId);

    if (!member) {
        return res.status(404).json({
            success: false,
            message: 'Member not found',
        });
    }

    member.role = req.body.role;
    await project.save();

    res.json({
        success: true,
        message: 'Member role updated successfully',
    });
});
