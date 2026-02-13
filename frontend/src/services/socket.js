import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

class SocketService {
    constructor() {
        this.socket = null;
    }

    connect(userId) {
        if (this.socket?.connected) {
            return;
        }

        this.socket = io(SOCKET_URL, {
            auth: {
                token: localStorage.getItem('accessToken'),
            },
        });

        this.socket.on('connect', () => {
            console.log('✅ Socket connected');
            if (userId) {
                this.socket.emit('user:join', userId);
            }
        });

        this.socket.on('disconnect', () => {
            console.log('❌ Socket disconnected');
        });

        this.socket.on('connect_error', (error) => {
            console.error('Socket connection error:', error);
        });
    }

    disconnect() {
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
        }
    }

    // Task events
    joinTaskRoom(taskId) {
        this.socket?.emit('task:join', taskId);
    }

    leaveTaskRoom(taskId) {
        this.socket?.emit('task:leave', taskId);
    }

    onTaskUpdate(callback) {
        this.socket?.on('task:updated', callback);
    }

    emitTaskUpdate(taskId, data) {
        this.socket?.emit('task:update', { taskId, ...data });
    }

    // Project events
    joinProjectRoom(projectId) {
        this.socket?.emit('project:join', projectId);
    }

    leaveProjectRoom(projectId) {
        this.socket?.emit('project:leave', projectId);
    }

    onProjectMessage(callback) {
        this.socket?.on('project:newMessage', callback);
    }

    onProjectMessageDeleted(callback) {
        this.socket?.on('project:messageDeleted', callback);
    }

    emitProjectTyping(projectId, isTyping, userName) {
        this.socket?.emit('project:typing', { projectId, isTyping, userName });
    }

    onProjectUserTyping(callback) {
        this.socket?.on('project:userTyping', callback);
    }

    onProjectUserJoined(callback) {
        this.socket?.on('project:userJoined', callback);
    }

    onProjectUserLeft(callback) {
        this.socket?.on('project:userLeft', callback);
    }

    // Chat events
    joinChatRoom(roomId) {
        this.socket?.emit('chat:join', roomId);
    }

    leaveChatRoom(roomId) {
        this.socket?.emit('chat:leave', roomId);
    }

    sendMessage(roomId, message) {
        this.socket?.emit('chat:message', { roomId, message });
    }

    onNewMessage(callback) {
        this.socket?.on('chat:newMessage', callback);
    }

    emitTyping(roomId, isTyping) {
        this.socket?.emit('chat:typing', { roomId, isTyping });
    }

    onUserTyping(callback) {
        this.socket?.on('chat:userTyping', callback);
    }

    // Notification events
    sendNotification(recipientId, notification) {
        this.socket?.emit('notification:send', { recipientId, notification });
    }

    onNewNotification(callback) {
        this.socket?.on('notification:new', callback);
    }

    // User status events
    onUserOnline(callback) {
        this.socket?.on('user:online', callback);
    }

    onUserOffline(callback) {
        this.socket?.on('user:offline', callback);
    }

    onActiveUsers(callback) {
        this.socket?.on('users:active', callback);
    }

    // Generic event listener
    on(event, callback) {
        this.socket?.on(event, callback);
    }

    // Generic event emitter
    emit(event, data) {
        this.socket?.emit(event, data);
    }

    // Remove event listener
    off(event, callback) {
        this.socket?.off(event, callback);
    }
}

const socketService = new SocketService();

export default socketService;
