import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import { Server } from 'socket.io';
import { createServer } from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import cron from 'node-cron';

// Config
dotenv.config();

// Database
import connectDB from './config/database.js';

// Routes
import authRoutes from './routes/auth.js';
import taskRoutes from './routes/tasks.js';
import projectRoutes from './routes/projects.js';
import notificationRoutes from './routes/notifications.js';
import fileRoutes from './routes/files.js';
import dashboardRoutes from './routes/dashboard.js';
import userRoutes from './routes/users.js';
import chatRoutes from './routes/chat.js';
import adminRoutes from './routes/admin.js';

// Middleware
import { errorHandler, notFound } from './middleware/error.js';

// Utils
import { checkDeadlines } from './utils/deadlineReminder.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize app
const app = express();
const httpServer = createServer(app);

// Connect to database
connectDB();

// Security middleware
app.use(
    helmet({
        crossOriginResourcePolicy: { policy: "cross-origin" },
        crossOriginEmbedderPolicy: false,
        contentSecurityPolicy: {
            directives: {
                defaultSrc: ["'self'"],
                imgSrc: ["'self'", "data:", "blob:", "http://localhost:5000", "http://localhost:5173"],
                mediaSrc: ["'self'", "blob:", "http://localhost:5000"],
                frameSrc: ["'self'", "blob:"],
            },
        },
    })
);


// CORS
app.use(
    cors({
        origin: process.env.FRONTEND_URL || 'http://localhost:5173',
        credentials: true,
    })
);

// Rate limiting
const limiter = rateLimit({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 1000, // Increased for development
    message: 'Too many requests from this IP, please try again later.',
    skip: (req) => process.env.NODE_ENV === 'development' && req.ip === '::1', // Skip for localhost in dev
});

// Apply rate limiting only to auth routes in development, all routes in production
if (process.env.NODE_ENV === 'production') {
    app.use('/api/', limiter);
} else {
    // More lenient in development - only limit auth routes
    const authLimiter = rateLimit({
        windowMs: 15 * 60 * 1000,
        max: 50,
        message: 'Too many authentication attempts, please try again later.',
    });
    app.use('/api/auth', authLimiter);
}

// Body parser
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Compression
app.use(compression());

// Logging
if (process.env.NODE_ENV === 'development') {
    app.use(morgan('dev'));
}

// Static files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/files', fileRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/users', userRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/admin', adminRoutes);

// Health check
app.get('/api/health', (req, res) => {
    res.json({
        success: true,
        message: 'Server is running',
        timestamp: new Date().toISOString(),
    });
});

// Error handlers
app.use(notFound);
app.use(errorHandler);

// Socket.IO setup
const io = new Server(httpServer, {
    cors: {
        origin: process.env.FRONTEND_URL || 'http://localhost:5173',
        credentials: true,
    },
});

// Store io instance in app for access by routes
app.set('io', io);

// Store active users
const activeUsers = new Map();
io.activeUsers = activeUsers; // Also attach to io for deadline reminders

io.on('connection', (socket) => {
    console.log(`✅ User connected: ${socket.id}`);

    // User joins
    socket.on('user:join', (userId) => {
        activeUsers.set(userId, socket.id);
        socket.userId = userId;
        socket.join(`user:${userId}`); // Join own user room for notifications

        // Broadcast user online status
        io.emit('user:online', { userId });

        // Send active users list
        socket.emit('users:active', Array.from(activeUsers.keys()));
    });

    // Join task room
    socket.on('task:join', (taskId) => {
        socket.join(`task:${taskId}`);
        console.log(`User ${socket.userId} joined task room: ${taskId}`);
    });

    // Leave task room
    socket.on('task:leave', (taskId) => {
        socket.leave(`task:${taskId}`);
    });

    // Task update
    socket.on('task:update', (data) => {
        socket.to(`task:${data.taskId}`).emit('task:updated', data);
    });

    // Task assigned notification
    socket.on('task_assigned', (data) => {
        const { projectId, assignedTo, taskTitle, assignedBy } = data;
        // Notify the assigned user
        const targetSocketId = activeUsers.get(assignedTo);
        if (targetSocketId) {
            io.to(targetSocketId).emit('notification:new', {
                type: 'task_assigned',
                title: 'New Task Assigned',
                message: `${assignedBy} assigned you a task: ${taskTitle}`,
                projectId,
            });
        }
        // Broadcast to project room
        socket.to(`project:${projectId}`).emit('task_assigned', data);
    });

    // Task completed notification
    socket.on('task_completed', (data) => {
        const { projectId, taskTitle, completedBy } = data;
        // Broadcast to project room
        io.to(`project:${projectId}`).emit('task_completed', {
            type: 'task_completed',
            title: 'Task Completed',
            message: `${completedBy} completed: ${taskTitle}`,
            projectId,
        });
    });

    // Join project room
    socket.on('project:join', (projectId) => {
        socket.join(`project:${projectId}`);
        console.log(`User ${socket.userId} joined project room: ${projectId}`);

        // Notify others in project
        socket.to(`project:${projectId}`).emit('project:userJoined', {
            userId: socket.userId,
        });
    });

    // Leave project room
    socket.on('project:leave', (projectId) => {
        socket.leave(`project:${projectId}`);
        console.log(`User ${socket.userId} left project room: ${projectId}`);

        // Notify others
        socket.to(`project:${projectId}`).emit('project:userLeft', {
            userId: socket.userId,
        });
    });

    // Typing indicator for project chat
    socket.on('project:typing', (data) => {
        socket.to(`project:${data.projectId}`).emit('project:userTyping', {
            userId: socket.userId,
            isTyping: data.isTyping,
            userName: data.userName,
        });
    });

    // Direct chat message
    socket.on('chat:send-message', async (message) => {
        console.log('📨 Chat message from:', socket.userId, 'to:', message.recipient);

        try {
            // Import DirectMessage model
            const DirectMessage = (await import('./models/DirectMessage.js')).default;

            // Save message to database
            const savedMessage = await DirectMessage.create({
                sender: message.sender._id,
                recipient: message.recipient,
                content: message.content,
                type: message.type || 'text',
                fileUrl: message.fileUrl,
                fileName: message.fileName,
                fileSize: message.fileSize,
                status: 'sent',
            });

            // Populate sender info
            await savedMessage.populate('sender', 'name email avatar');

            // Create response message with populated data
            const messageToSend = {
                _id: savedMessage._id,
                sender: savedMessage.sender,
                recipient: savedMessage.recipient,
                content: savedMessage.content,
                type: savedMessage.type,
                fileUrl: savedMessage.fileUrl,
                fileName: savedMessage.fileName,
                fileSize: savedMessage.fileSize,
                status: savedMessage.status,
                createdAt: savedMessage.createdAt,
            };

            // Send to recipient if online
            const recipientSocketId = activeUsers.get(message.recipient);
            if (recipientSocketId) {
                io.to(recipientSocketId).emit('chat:message', messageToSend);

                // Notify recipient about new unread message
                io.to(recipientSocketId).emit('new-unread-message', {
                    senderId: message.sender._id,
                });

                // Update status to delivered
                savedMessage.status = 'delivered';
                await savedMessage.save();
            }

            // Send back to sender with saved message ID
            socket.emit('chat:message-sent', messageToSend);

            // Send notification to recipient
            if (recipientSocketId) {
                io.to(recipientSocketId).emit('notification:new', {
                    type: 'new_message',
                    title: 'New Message',
                    message: `${message.sender.name} sent you a message`,
                    link: '/chat',
                    sender: message.sender,
                });
            }
        } catch (error) {
            console.error('Error saving message:', error);
            socket.emit('chat:error', { message: 'Failed to send message' });
        }
    });

    // Chat typing indicator
    socket.on('chat:typing', (data) => {
        const recipientSocketId = activeUsers.get(data.recipientId);
        if (recipientSocketId) {
            io.to(recipientSocketId).emit('chat:typing', {
                userId: data.userId,
                userName: data.userName,
            });
        }
    });

    // Room-based chat (for project chat)
    socket.on('chat:join', (roomId) => {
        socket.join(`room:${roomId}`);
    });

    socket.on('chat:leave', (roomId) => {
        socket.leave(`room:${roomId}`);
    });

    socket.on('project:send-message', (data) => {
        const { projectId, message } = data;
        // Broadcast to all in project room
        io.to(`project:${projectId}`).emit('project:newMessage', message);
    });

    // Notification
    socket.on('notification:send', (data) => {
        const targetSocketId = activeUsers.get(data.recipientId);
        if (targetSocketId) {
            io.to(targetSocketId).emit('notification:new', data.notification);
        }
    });

    // Disconnect
    socket.on('disconnect', () => {
        console.log(`❌ User disconnected: ${socket.id}`);

        if (socket.userId) {
            activeUsers.delete(socket.userId);
            io.emit('user:offline', { userId: socket.userId });
        }
    });
});

// Make io accessible to routes
app.set('io', io);

// Start server
const PORT = process.env.PORT || 5000;

httpServer.listen(PORT, () => {
    console.log(`
╔═══════════════════════════════════════════╗
║                                           ║
║    Task Manager API Server                ║
║                                           ║
║   Environment: ${process.env.NODE_ENV || 'development'}                ║
║   Port: ${PORT}                           ║
║   Database: Connected                     ║
║   WebSocket: Active                       ║
║                                           ║
╚═══════════════════════════════════════════╝
  `);

    // Start deadline reminder cron job
    // Runs every 15 minutes to check for upcoming deadlines
    cron.schedule('*/15 * * * *', async () => {
        console.log('🔔 Running deadline check...');
        try {
            await checkDeadlines(io);
        } catch (error) {
            console.error('Error in deadline cron job:', error);
        }
    });

    console.log('⏰ Deadline reminder cron job started (runs every 15 minutes)');

    // Run initial check on startup
    setTimeout(async () => {
        console.log('🔔 Running initial deadline check...');
        try {
            await checkDeadlines(io);
        } catch (error) {
            console.error('Error in initial deadline check:', error);
        }
    }, 5000); // Wait 5 seconds after startup
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
    console.error('❌ Unhandled Rejection:', err);
    // Close server & exit process
    httpServer.close(() => process.exit(1));
});

export default app;
