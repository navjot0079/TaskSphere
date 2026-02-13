import express from 'express';
import {
    uploadFile,
    getFiles,
    getFile,
    downloadFile,
    viewFile,
    deleteFile,
    getFileStats,
} from '../controllers/fileController.js';
import { protect } from '../middleware/auth.js';
import upload from '../middleware/upload.js';

const router = express.Router();

// All routes are protected
router.use(protect);

router.post('/upload', upload.single('file'), uploadFile);
router.get('/', getFiles);
router.get('/stats', getFileStats);
router.get('/:id', getFile);
router.get('/:id/download', downloadFile);
router.get('/:id/view', viewFile);
router.delete('/:id', deleteFile);

export default router;
