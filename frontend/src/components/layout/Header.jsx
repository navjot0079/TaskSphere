import { useState, useEffect } from 'react';
import { Menu, Bell, Moon, Sun, LogOut, Sparkles, Zap, Crown, Check, X } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { notificationAPI, projectAPI } from '../../services/api';
import { useSocket } from '../../context/SocketContext';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';

const Header = ({ onMenuClick }) => {
    const { theme, toggleTheme } = useTheme();
    const { user, logout } = useAuth();
    const { socket } = useSocket();
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [showNotifications, setShowNotifications] = useState(false);

    useEffect(() => {
        fetchNotifications();
        fetchUnreadCount();

        // Listen for new notifications
        if (socket?.socket) {
            const handleNewNotification = (notification) => {
                console.log('🔔 New notification:', notification);
                setNotifications(prev => [notification, ...prev]);
                setUnreadCount(prev => prev + 1);
                toast.success(notification.title);
            };

            socket.socket.on('notification:new', handleNewNotification);

            return () => {
                socket.socket.off('notification:new', handleNewNotification);
            };
        }
    }, [socket]);

    const fetchNotifications = async () => {
        try {
            const { data } = await notificationAPI.getNotifications({ limit: 5 });
            setNotifications(data.notifications);
        } catch (error) {
            console.error('Error fetching notifications:', error);
        }
    };

    const fetchUnreadCount = async () => {
        try {
            const { data } = await notificationAPI.getUnreadCount();
            setUnreadCount(data.count);
        } catch (error) {
            console.error('Error fetching unread count:', error);
        }
    };

    const handleMarkAllRead = async () => {
        try {
            await notificationAPI.markAllAsRead();
            setUnreadCount(0);
            setNotifications(prev =>
                prev.map(n => ({ ...n, isRead: true }))
            );
        } catch (error) {
            console.error('Error marking notifications as read:', error);
        }
    };

    const handleAcceptInvite = async (notification) => {
        try {
            const projectId = notification.relatedProject;
            await projectAPI.acceptInvite(projectId);
            toast.success('Successfully joined the project!');

            // Refresh notifications to sync with backend
            await fetchNotifications();
            await fetchUnreadCount();
        } catch (error) {
            const errorMessage = error.response?.data?.message || 'Failed to accept invitation';
            toast.error(errorMessage);

            // If already a member, remove the notification
            if (errorMessage.includes('already a member')) {
                await notificationAPI.markAsRead(notification._id);
                setNotifications(prev => prev.filter(n => n._id !== notification._id));
                setUnreadCount(prev => Math.max(0, prev - 1));
            }
        }
    };

    const handleDeclineInvite = async (notification) => {
        try {
            // Mark notification as read
            await notificationAPI.markAsRead(notification._id);

            // Refresh notifications
            await fetchNotifications();
            await fetchUnreadCount();

            toast.success('Invitation declined');
        } catch (error) {
            toast.error('Failed to decline invitation');
        }
    };

    const handleLogout = async () => {
        await logout();
        window.location.href = '/login';
    };

    return (
        <header className="fixed top-0 right-0 left-0 lg:left-64 h-16 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 z-30 backdrop-blur-sm bg-opacity-90 dark:bg-opacity-90">
            {/* Animated background gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-r from-primary-500/5 via-purple-500/5 to-pink-500/5 opacity-50"></div>

            <div className="relative h-full px-6 flex items-center justify-between">
                {/* Left side - Animated Greeting */}
                <div className="flex items-center space-x-4">
                    <button
                        onClick={onMenuClick}
                        className="lg:hidden text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                    >
                        <Menu className="w-6 h-6" />
                    </button>

                    {/* Animated Welcome Section */}
                    <motion.div
                        className="hidden md:flex items-center space-x-3"
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.5 }}
                    >
                        {/* Animated Icon */}
                        <motion.div
                            animate={{
                                rotate: [0, 10, -10, 5, -5, 0],
                                scale: [1, 1.1, 1]
                            }}
                            transition={{
                                duration: 2,
                                repeat: Infinity,
                                repeatDelay: 3
                            }}
                        >
                            {user?.role === 'admin' ? (
                                <Crown className="w-6 h-6 text-yellow-500" />
                            ) : (
                                <Sparkles className="w-6 h-6 text-primary-500" />
                            )}
                        </motion.div>

                        {/* Gradient Text Greeting */}
                        <div className="flex flex-col">
                            <motion.h1
                                className="text-lg font-bold bg-gradient-to-r from-primary-600 via-purple-600 to-pink-600 bg-clip-text text-transparent bg-gradient-size animate-gradient"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: 0.2 }}
                            >
                                Welcome back, {user?.name?.split(' ')[0] || 'User'}!
                            </motion.h1>

                            {/* Animated Role Badge */}
                            <motion.div
                                className="flex items-center space-x-2 mt-0.5"
                                initial={{ opacity: 0, y: 5 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.4 }}
                            >
                                <motion.span
                                    className={`text-xs px-2 py-0.5 rounded-full font-medium ${user?.role === 'admin'
                                        ? 'bg-gradient-to-r from-yellow-400 to-orange-500 text-white'
                                        : 'bg-gradient-to-r from-blue-400 to-cyan-500 text-white'
                                        }`}
                                    animate={{
                                        boxShadow: [
                                            '0 0 0px rgba(59, 130, 246, 0)',
                                            '0 0 20px rgba(59, 130, 246, 0.3)',
                                            '0 0 0px rgba(59, 130, 246, 0)'
                                        ]
                                    }}
                                    transition={{
                                        duration: 2,
                                        repeat: Infinity,
                                        repeatDelay: 1
                                    }}
                                >
                                    {user?.role?.toUpperCase()}
                                </motion.span>

                                {/* Pulse Indicator */}
                                <motion.div
                                    className="flex items-center space-x-1"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    transition={{ delay: 0.6 }}
                                >
                                    <motion.div
                                        className="w-2 h-2 bg-green-500 rounded-full"
                                        animate={{
                                            scale: [1, 1.3, 1],
                                            opacity: [1, 0.5, 1]
                                        }}
                                        transition={{
                                            duration: 2,
                                            repeat: Infinity
                                        }}
                                    />
                                    <span className="text-xs text-gray-500 dark:text-gray-400">Online</span>
                                </motion.div>
                            </motion.div>
                        </div>
                    </motion.div>
                </div>

                {/* Right side */}
                <div className="flex items-center space-x-3">
                    {/* Theme toggle with enhanced animation */}
                    <motion.button
                        onClick={toggleTheme}
                        className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors relative overflow-hidden"
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                    >
                        <motion.div
                            initial={false}
                            animate={{ rotate: theme === 'light' ? 0 : 180 }}
                            transition={{ duration: 0.3 }}
                        >
                            {theme === 'light' ? (
                                <Moon className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                            ) : (
                                <Sun className="w-5 h-5 text-yellow-500" />
                            )}
                        </motion.div>
                    </motion.button>

                    {/* Notifications with bounce animation */}
                    <div className="relative">
                        <motion.button
                            onClick={() => setShowNotifications(!showNotifications)}
                            className="relative p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                        >
                            <Bell className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                            {unreadCount > 0 && (
                                <motion.span
                                    className="absolute top-1 right-1 w-4 h-4 bg-red-500 rounded-full text-xs text-white flex items-center justify-center"
                                    initial={{ scale: 0 }}
                                    animate={{
                                        scale: [1, 1.2, 1],
                                    }}
                                    transition={{
                                        duration: 0.5,
                                        repeat: Infinity,
                                        repeatDelay: 2
                                    }}
                                >
                                    {unreadCount > 9 ? '9+' : unreadCount}
                                </motion.span>
                            )}
                        </motion.button>

                        {/* Notifications dropdown */}
                        <AnimatePresence>
                            {showNotifications && (
                                <motion.div
                                    initial={{ opacity: 0, y: -10, scale: 0.95 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={{ opacity: 0, y: -10, scale: 0.95 }}
                                    transition={{ duration: 0.2 }}
                                    className="absolute right-0 mt-2 w-80 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden"
                                >
                                    <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between bg-gradient-to-r from-primary-50 to-purple-50 dark:from-gray-700 dark:to-gray-700">
                                        <h3 className="font-semibold text-gray-900 dark:text-white flex items-center space-x-2">
                                            <Zap className="w-4 h-4 text-primary-500" />
                                            <span>Notifications</span>
                                        </h3>
                                        {unreadCount > 0 && (
                                            <motion.button
                                                onClick={handleMarkAllRead}
                                                className="text-xs text-primary-600 hover:text-primary-700 font-medium"
                                                whileHover={{ scale: 1.05 }}
                                                whileTap={{ scale: 0.95 }}
                                            >
                                                Mark all read
                                            </motion.button>
                                        )}
                                    </div>

                                    <div className="max-h-96 overflow-y-auto custom-scrollbar">
                                        {notifications.length === 0 ? (
                                            <motion.div
                                                className="p-8 text-center text-gray-500 dark:text-gray-400"
                                                initial={{ opacity: 0 }}
                                                animate={{ opacity: 1 }}
                                            >
                                                <Bell className="w-12 h-12 mx-auto mb-2 text-gray-300 dark:text-gray-600" />
                                                <p>No notifications</p>
                                            </motion.div>
                                        ) : (
                                            notifications.map((notification, index) => (
                                                <motion.div
                                                    key={notification._id}
                                                    className={`p-4 border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 ${notification.type !== 'project_invited' ? 'cursor-pointer' : ''} ${!notification.isRead ? 'bg-primary-50/50 dark:bg-primary-900/10' : ''
                                                        }`}
                                                    initial={{ opacity: 0, x: -20 }}
                                                    animate={{ opacity: 1, x: 0 }}
                                                    transition={{ delay: index * 0.05 }}
                                                    whileHover={{ x: notification.type !== 'project_invited' ? 4 : 0 }}
                                                >
                                                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                                                        {notification.title}
                                                    </p>
                                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                                        {notification.message}
                                                    </p>
                                                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
                                                        {new Date(notification.createdAt).toLocaleString()}
                                                    </p>

                                                    {/* Accept/Decline buttons for project invitations */}
                                                    {notification.type === 'project_invited' && !notification.isRead && (
                                                        <div className="flex items-center gap-2 mt-3">
                                                            <motion.button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    handleAcceptInvite(notification);
                                                                }}
                                                                className="flex-1 flex items-center justify-center gap-1 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-xs rounded-lg transition-colors"
                                                                whileHover={{ scale: 1.02 }}
                                                                whileTap={{ scale: 0.98 }}
                                                            >
                                                                <Check className="w-3 h-3" />
                                                                Accept
                                                            </motion.button>
                                                            <motion.button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    handleDeclineInvite(notification);
                                                                }}
                                                                className="flex-1 flex items-center justify-center gap-1 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs rounded-lg transition-colors"
                                                                whileHover={{ scale: 1.02 }}
                                                                whileTap={{ scale: 0.98 }}
                                                            >
                                                                <X className="w-3 h-3" />
                                                                Decline
                                                            </motion.button>
                                                        </div>
                                                    )}
                                                </motion.div>
                                            ))
                                        )}
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    {/* Logout with animation */}
                    <motion.button
                        onClick={handleLogout}
                        className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors group"
                        title="Logout"
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                    >
                        <LogOut className="w-5 h-5 text-gray-600 dark:text-gray-400 group-hover:text-red-600 dark:group-hover:text-red-400 transition-colors" />
                    </motion.button>
                </div>
            </div>
        </header>
    );
};

export default Header;
