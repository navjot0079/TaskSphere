import express from 'express';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

// Admin routes can be added here as needed

export default router;
