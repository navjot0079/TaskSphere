import mongoose from 'mongoose';

const projectMessageSchema = new mongoose.Schema(
    {
        project: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Project',
            required: true,
        },
        sender: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        message: {
            type: String,
            required: [true, 'Message content is required'],
            trim: true,
            maxlength: [2000, 'Message cannot exceed 2000 characters'],
        },
        recipientId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            default: null, // null means it's a group message
        },
        attachments: [{
            fileName: String,
            fileUrl: String,
            fileSize: Number,
            fileType: String,
        }],
        isEdited: {
            type: Boolean,
            default: false,
        },
        editedAt: Date,
        readBy: [{
            user: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'User',
            },
            readAt: {
                type: Date,
                default: Date.now,
            },
        }],
    },
    {
        timestamps: true,
    }
);

// Indexes
projectMessageSchema.index({ project: 1, createdAt: -1 });
projectMessageSchema.index({ sender: 1 });

const ProjectMessage = mongoose.model('ProjectMessage', projectMessageSchema);

export default ProjectMessage;
