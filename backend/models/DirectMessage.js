import mongoose from 'mongoose';

const directMessageSchema = new mongoose.Schema(
    {
        sender: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        recipient: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        content: {
            type: String,
            required: true,
            trim: true,
            maxlength: [2000, 'Message cannot exceed 2000 characters'],
        },
        type: {
            type: String,
            enum: ['text', 'image', 'document'],
            default: 'text',
        },
        fileUrl: {
            type: String,
        },
        fileName: {
            type: String,
        },
        fileSize: {
            type: Number,
        },
        status: {
            type: String,
            enum: ['sent', 'delivered', 'read'],
            default: 'sent',
        },
        isRead: {
            type: Boolean,
            default: false,
        },
        readAt: {
            type: Date,
        },
    },
    {
        timestamps: true,
    }
);

// Indexes for efficient queries
directMessageSchema.index({ sender: 1, recipient: 1, createdAt: -1 });
directMessageSchema.index({ recipient: 1, isRead: 1 });
directMessageSchema.index({ createdAt: -1 });

const DirectMessage = mongoose.model('DirectMessage', directMessageSchema);

export default DirectMessage;
