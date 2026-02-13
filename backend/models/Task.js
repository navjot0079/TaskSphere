import mongoose from 'mongoose';

const taskSchema = new mongoose.Schema(
    {
        title: {
            type: String,
            required: [true, 'Task title is required'],
            trim: true,
            maxlength: [200, 'Title cannot exceed 200 characters'],
        },
        description: {
            type: String,
            trim: true,
            maxlength: [2000, 'Description cannot exceed 2000 characters'],
        },
        status: {
            type: String,
            enum: ['todo', 'in-progress', 'review', 'completed', 'cancelled'],
            default: 'todo',
        },
        priority: {
            type: String,
            enum: ['low', 'medium', 'high', 'urgent'],
            default: 'medium',
        },
        dueDate: {
            type: Date,
        },
        startDate: {
            type: Date,
            default: Date.now,
        },
        completedDate: {
            type: Date,
        },
        assignedTo: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
        },
        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        project: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Project',
        },
        tags: [{
            type: String,
            trim: true,
        }],
        subtasks: [{
            title: {
                type: String,
                required: true,
            },
            completed: {
                type: Boolean,
                default: false,
            },
            completedBy: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'User',
            },
            completedAt: Date,
        }],
        attachments: [{
            fileName: String,
            fileUrl: String,
            fileSize: Number,
            uploadedBy: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'User',
            },
            uploadedAt: {
                type: Date,
                default: Date.now,
            },
        }],
        timeTracking: {
            estimatedHours: {
                type: Number,
                default: 0,
            },
            loggedHours: {
                type: Number,
                default: 0,
            },
            sessions: [{
                startTime: Date,
                endTime: Date,
                duration: Number, // in minutes
                user: {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: 'User',
                },
            }],
        },
        position: {
            type: Number,
            default: 0,
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

// Indexes for better query performance
taskSchema.index({ assignedTo: 1, status: 1 });
taskSchema.index({ project: 1, status: 1 });
taskSchema.index({ dueDate: 1 });
taskSchema.index({ createdBy: 1 });

// Virtual for comments
taskSchema.virtual('comments', {
    ref: 'Comment',
    localField: '_id',
    foreignField: 'task',
});

// Virtual for progress percentage
taskSchema.virtual('progress').get(function () {
    if (this.subtasks.length === 0) return 0;
    const completed = this.subtasks.filter(st => st.completed).length;
    return Math.round((completed / this.subtasks.length) * 100);
});

// Auto-update completedDate
taskSchema.pre('save', function (next) {
    if (this.isModified('status') && this.status === 'completed') {
        this.completedDate = Date.now();
    }
    next();
});

const Task = mongoose.model('Task', taskSchema);

export default Task;
