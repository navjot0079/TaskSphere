import mongoose from 'mongoose';

const activityLogSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        action: {
            type: String,
            required: true,
            enum: [
                'task_created',
                'task_updated',
                'task_deleted',
                'task_completed',
                'project_created',
                'project_updated',
                'project_deleted',
                'comment_added',
                'file_uploaded',
                'user_invited',
                'user_removed',
                'login',
                'logout',
                'settings_changed',
            ],
        },
        description: {
            type: String,
            required: true,
        },
        relatedTask: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Task',
        },
        relatedProject: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Project',
        },
        metadata: {
            type: mongoose.Schema.Types.Mixed,
        },
        ipAddress: String,
        userAgent: String,
    },
    {
        timestamps: true,
    }
);

// Indexes
activityLogSchema.index({ user: 1, createdAt: -1 });
activityLogSchema.index({ action: 1, createdAt: -1 });
activityLogSchema.index({ relatedTask: 1 });
activityLogSchema.index({ relatedProject: 1 });

const ActivityLog = mongoose.model('ActivityLog', activityLogSchema);

export default ActivityLog;
