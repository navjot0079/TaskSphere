import express from 'express';
import { body } from 'express-validator';
import {
    getTasks,
    getTask,
    createTask,
    updateTask,
    deleteTask,
    addSubtask,
    updateSubtask,
    startTimeTracking,
    stopTimeTracking,
    getTaskStats,
} from '../controllers/taskController.js';
import { protect } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';

const router = express.Router();

// All routes are protected
router.use(protect);

router
    .route('/')
    .get(getTasks)
    .post(
        [
            body('title').trim().notEmpty().withMessage('Task title is required'),
            body('status').optional().isIn(['todo', 'in-progress', 'review', 'completed', 'cancelled']),
            body('priority').optional().isIn(['low', 'medium', 'high', 'urgent']),
        ],
        validate,
        createTask
    );

router.get('/stats', getTaskStats);

router
    .route('/:id')
    .get(getTask)
    .put(updateTask)
    .delete(deleteTask);

router.post('/:id/subtasks', addSubtask);
router.put('/:id/subtasks/:subtaskId', updateSubtask);

router.post('/:id/time-tracking/start', startTimeTracking);
router.post('/:id/time-tracking/stop', stopTimeTracking);

export default router;
