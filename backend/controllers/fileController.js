import File from '../models/File.js';
import { asyncHandler } from '../middleware/error.js';
import { getFileType } from '../middleware/upload.js';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * @desc    Upload file
 * @route   POST /api/files/upload
 * @access  Private
 */
export const uploadFile = asyncHandler(async (req, res) => {
    if (!req.file) {
        return res.status(400).json({
            success: false,
            message: 'No file uploaded',
        });
    }

    const { relatedTask, relatedProject, folder = 'root' } = req.body;

    const fileData = {
        fileName: req.file.filename,
        originalName: req.file.originalname,
        fileUrl: `/uploads/${req.file.filename}`,
        fileSize: req.file.size,
        mimeType: req.file.mimetype,
        fileType: getFileType(req.file.mimetype),
        uploadedBy: req.user._id,
        relatedTask,
        relatedProject,
        folder,
    };

    const file = await File.create(fileData);
    await file.populate('uploadedBy', 'name avatar');

    res.status(201).json({
        success: true,
        message: 'File uploaded successfully',
        file,
    });
});

/**
 * @desc    Get all files
 * @route   GET /api/files
 * @access  Private
 */
export const getFiles = asyncHandler(async (req, res) => {
    const { folder, fileType, relatedTask, relatedProject } = req.query;

    const query = {};

    if (folder) query.folder = folder;
    if (fileType) query.fileType = fileType;
    if (relatedTask) query.relatedTask = relatedTask;
    if (relatedProject) query.relatedProject = relatedProject;

    // Users can only see their own files unless admin
    if (req.user.role !== 'admin') {
        query.uploadedBy = req.user._id;
    }

    const files = await File.find(query)
        .populate('uploadedBy', 'name email avatar')
        .populate('relatedTask', 'title')
        .populate('relatedProject', 'name')
        .sort({ createdAt: -1 });

    res.json({
        success: true,
        count: files.length,
        files,
    });
});

/**
 * @desc    Get single file
 * @route   GET /api/files/:id
 * @access  Private
 */
export const getFile = asyncHandler(async (req, res) => {
    const file = await File.findById(req.params.id)
        .populate('uploadedBy', 'name email avatar')
        .populate('relatedTask', 'title')
        .populate('relatedProject', 'name')
        .populate('versions.uploadedBy', 'name avatar');

    if (!file) {
        return res.status(404).json({
            success: false,
            message: 'File not found',
        });
    }

    res.json({
        success: true,
        file,
    });
});

/**
 * @desc    Download file
 * @route   GET /api/files/:id/download
 * @access  Private
 */
export const downloadFile = asyncHandler(async (req, res) => {
    const file = await File.findById(req.params.id);

    if (!file) {
        return res.status(404).json({
            success: false,
            message: 'File not found',
        });
    }

    const filePath = path.join(__dirname, '..', 'uploads', file.fileName);

    if (!fs.existsSync(filePath)) {
        return res.status(404).json({
            success: false,
            message: 'File not found on server',
        });
    }

    // Increment download count
    file.downloads += 1;
    await file.save();

    // Set proper headers
    res.setHeader('Content-Type', file.mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(file.originalName)}"`);
    res.setHeader('Content-Length', file.fileSize);
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition');

    // Stream the file
    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);
});

/**
 * @desc    View/Stream file (for preview)
 * @route   GET /api/files/:id/view
 * @access  Private
 */
export const viewFile = asyncHandler(async (req, res) => {
    const file = await File.findById(req.params.id);

    if (!file) {
        return res.status(404).json({
            success: false,
            message: 'File not found',
        });
    }

    const filePath = path.join(__dirname, '..', 'uploads', file.fileName);

    if (!fs.existsSync(filePath)) {
        return res.status(404).json({
            success: false,
            message: 'File not found on server',
        });
    }

    // Set headers for inline viewing
    res.setHeader('Content-Type', file.mimeType);
    res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(file.originalName)}"`);
    res.setHeader('Content-Length', file.fileSize);
    res.setHeader('Cache-Control', 'public, max-age=86400'); // Cache for 1 day
    res.setHeader('Access-Control-Allow-Origin', '*');

    // Stream the file
    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);
});

/**
 * @desc    Delete file
 * @route   DELETE /api/files/:id
 * @access  Private
 */
export const deleteFile = asyncHandler(async (req, res) => {
    const file = await File.findById(req.params.id);

    if (!file) {
        return res.status(404).json({
            success: false,
            message: 'File not found',
        });
    }

    // Check permissions
    const canDelete =
        req.user.role === 'admin' ||
        file.uploadedBy.toString() === req.user._id.toString();

    if (!canDelete) {
        return res.status(403).json({
            success: false,
            message: 'Not authorized to delete this file',
        });
    }

    // Delete physical file
    const filePath = path.join(__dirname, '..', 'uploads', file.fileName);
    if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
    }

    await file.deleteOne();

    res.json({
        success: true,
        message: 'File deleted successfully',
    });
});

/**
 * @desc    Get storage statistics
 * @route   GET /api/files/stats
 * @access  Private
 */
export const getFileStats = asyncHandler(async (req, res) => {
    const userId = req.user.role === 'admin' ? undefined : req.user._id;

    const query = userId ? { uploadedBy: userId } : {};

    const totalFiles = await File.countDocuments(query);

    const sizeResult = await File.aggregate([
        { $match: query },
        {
            $group: {
                _id: null,
                totalSize: { $sum: '$fileSize' },
            },
        },
    ]);

    const typeStats = await File.aggregate([
        { $match: query },
        {
            $group: {
                _id: '$fileType',
                count: { $sum: 1 },
                size: { $sum: '$fileSize' },
            },
        },
    ]);

    res.json({
        success: true,
        stats: {
            totalFiles,
            totalSize: sizeResult[0]?.totalSize || 0,
            byType: typeStats,
        },
    });
});
