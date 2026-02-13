import express from 'express';
import { body } from 'express-validator';
import {
    getProjects,
    getProject,
    createProject,
    updateProject,
    deleteProject,
    inviteMember,
    acceptProjectInvite,
    removeMember,
    updateMemberRole,
} from '../controllers/projectController.js';
import {
    getProjectMessages,
    sendProjectMessage,
    markMessageAsRead,
    deleteProjectMessage,
} from '../controllers/projectChatController.js';
import { protect, authorize } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';

const router = express.Router();

// All routes are protected
router.use(protect);

router
    .route('/')
    .get(getProjects)
    .post(
        authorize('user', 'manager', 'admin'),
        [
            body('name').trim().notEmpty().withMessage('Project name is required'),
            body('status').optional().isIn(['planning', 'active', 'on-hold', 'completed', 'cancelled']),
            body('priority').optional().isIn(['low', 'medium', 'high', 'urgent']),
        ],
        validate,
        createProject
    );

router
    .route('/:id')
    .get(getProject)
    .put(updateProject)
    .delete(deleteProject);

// Member management routes
router.post('/:id/invite', inviteMember);
router.post('/:id/accept-invite', acceptProjectInvite);
router.delete('/:id/members/:userId', removeMember);
router.put('/:id/members/:userId', updateMemberRole);

// Project chat routes
router.get('/:id/messages', getProjectMessages);
router.post(
    '/:id/messages',
    [
        body('message').trim().notEmpty().withMessage('Message is required'),
    ],
    validate,
    sendProjectMessage
);
router.put('/:id/messages/:messageId/read', markMessageAsRead);
router.delete('/:id/messages/:messageId', deleteProjectMessage);

export default router;
