import mongoose from 'mongoose';

const chatRoomSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            trim: true,
            maxlength: [100, 'Room name cannot exceed 100 characters'],
        },
        type: {
            type: String,
            enum: ['direct', 'group', 'project', 'task'],
            required: true,
        },
        participants: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
        }],
        relatedProject: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Project',
        },
        relatedTask: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Task',
        },
        lastMessage: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Message',
        },
        lastMessageAt: {
            type: Date,
            default: Date.now,
        },
        isArchived: {
            type: Boolean,
            default: false,
        },
    },
    {
        timestamps: true,
    }
);

// Indexes
chatRoomSchema.index({ participants: 1 });
chatRoomSchema.index({ type: 1, lastMessageAt: -1 });

const ChatRoom = mongoose.model('ChatRoom', chatRoomSchema);

export default ChatRoom;
