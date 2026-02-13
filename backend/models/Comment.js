import mongoose from 'mongoose';

const commentSchema = new mongoose.Schema(
    {
        content: {
            type: String,
            required: [true, 'Comment content is required'],
            trim: true,
            maxlength: [2000, 'Comment cannot exceed 2000 characters'],
        },
        task: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Task',
            required: true,
        },
        author: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        mentions: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
        }],
        attachments: [{
            fileName: String,
            fileUrl: String,
            fileSize: Number,
        }],
        isEdited: {
            type: Boolean,
            default: false,
        },
        editedAt: Date,
    },
    {
        timestamps: true,
    }
);

// Indexes
commentSchema.index({ task: 1, createdAt: -1 });
commentSchema.index({ author: 1 });

const Comment = mongoose.model('Comment', commentSchema);

export default Comment;
