import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema(
    {
        content: {
            type: String,
            required: [true, 'Message content is required'],
            trim: true,
            maxlength: [2000, 'Message cannot exceed 2000 characters'],
        },
        sender: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        room: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'ChatRoom',
            required: true,
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
messageSchema.index({ room: 1, createdAt: -1 });
messageSchema.index({ sender: 1 });

const Message = mongoose.model('Message', messageSchema);

export default Message;
