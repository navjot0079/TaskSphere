import mongoose from 'mongoose';

const fileSchema = new mongoose.Schema(
    {
        fileName: {
            type: String,
            required: true,
            trim: true,
        },
        originalName: {
            type: String,
            required: true,
        },
        fileUrl: {
            type: String,
            required: true,
        },
        fileSize: {
            type: Number,
            required: true,
        },
        mimeType: {
            type: String,
            required: true,
        },
        fileType: {
            type: String,
            enum: ['image', 'document', 'video', 'audio', 'archive', 'other'],
            required: true,
        },
        uploadedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
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
        folder: {
            type: String,
            default: 'root',
        },
        versions: [{
            version: Number,
            fileUrl: String,
            uploadedAt: Date,
            uploadedBy: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'User',
            },
        }],
        isPublic: {
            type: Boolean,
            default: false,
        },
        downloads: {
            type: Number,
            default: 0,
        },
    },
    {
        timestamps: true,
    }
);

// Indexes
fileSchema.index({ uploadedBy: 1, createdAt: -1 });
fileSchema.index({ relatedTask: 1 });
fileSchema.index({ relatedProject: 1 });
fileSchema.index({ folder: 1 });

const File = mongoose.model('File', fileSchema);

export default File;
