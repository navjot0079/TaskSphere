import mongoose from 'mongoose';

const projectSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: [true, 'Project name is required'],
            trim: true,
            maxlength: [100, 'Name cannot exceed 100 characters'],
        },
        description: {
            type: String,
            trim: true,
            maxlength: [2000, 'Description cannot exceed 2000 characters'],
        },
        status: {
            type: String,
            enum: ['planning', 'active', 'on-hold', 'completed', 'cancelled'],
            default: 'planning',
        },
        priority: {
            type: String,
            enum: ['low', 'medium', 'high', 'urgent'],
            default: 'medium',
        },
        startDate: {
            type: Date,
            default: Date.now,
        },
        endDate: {
            type: Date,
        },
        owner: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        members: [{
            user: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'User',
            },
            role: {
                type: String,
                enum: ['owner', 'admin', 'member', 'viewer'],
                default: 'member',
            },
            joinedAt: {
                type: Date,
                default: Date.now,
            },
        }],
        tags: [{
            type: String,
            trim: true,
        }],
        color: {
            type: String,
            default: '#3B82F6',
        },
        thumbnail: {
            type: String,
            default: '',
        },
        budget: {
            allocated: {
                type: Number,
                default: 0,
            },
            spent: {
                type: Number,
                default: 0,
            },
        },
        isArchived: {
            type: Boolean,
            default: false,
        },
    },
    {
        timestamps: true,
        toJSON: { virtuals: true },
        toObject: { virtuals: true },
    }
);

// Indexes
projectSchema.index({ owner: 1 });
projectSchema.index({ 'members.user': 1 });
projectSchema.index({ status: 1 });

// Virtual for tasks
projectSchema.virtual('tasks', {
    ref: 'Task',
    localField: '_id',
    foreignField: 'project',
});

// Virtual for progress
projectSchema.virtual('progress').get(async function () {
    const Task = mongoose.model('Task');
    const totalTasks = await Task.countDocuments({ project: this._id });
    const completedTasks = await Task.countDocuments({
        project: this._id,
        status: 'completed'
    });

    return totalTasks === 0 ? 0 : Math.round((completedTasks / totalTasks) * 100);
});

const Project = mongoose.model('Project', projectSchema);

export default Project;
