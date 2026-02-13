import { Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';
import {
    CheckSquare,
    FolderKanban,
    MessageCircle,
    // FileText,
    Bell,
    Settings,
    Shield,
    X,
    ClipboardList,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import { chatAPI } from '../../services/api';

const Sidebar = ({ isOpen, onClose }) => {
    const location = useLocation();
    const { user } = useAuth();
    const { socket } = useSocket();
    const [unreadCount, setUnreadCount] = useState(0);

    // Fetch unread count on mount
    useEffect(() => {
        fetchUnreadCount();
    }, []);

    // Listen for new messages via socket
    useEffect(() => {
        if (socket?.socket) {
            const handleNewUnreadMessage = () => {
                // Only increment if we're not on the chat page
                if (location.pathname !== '/chat') {
                    setUnreadCount(prev => prev + 1);
                }
            };

            const handleMessagesMarkedRead = () => {
                // Refetch unread count when messages are marked as read
                fetchUnreadCount();
            };

            socket.socket.on('new-unread-message', handleNewUnreadMessage);
            socket.socket.on('chat:messages-marked-read', handleMessagesMarkedRead);

            return () => {
                socket.socket.off('new-unread-message', handleNewUnreadMessage);
                socket.socket.off('chat:messages-marked-read', handleMessagesMarkedRead);
            };
        }
    }, [socket, location.pathname]);

    const fetchUnreadCount = async () => {
        try {
            const response = await chatAPI.getUnreadCount();
            setUnreadCount(response.data.count);
        } catch (error) {
            console.error('Error fetching unread count:', error);
        }
    };

    const navItems = [

        { name: 'Search Tasks', path: '/tasks', icon: CheckSquare },
        { name: 'Projects', path: '/projects', icon: FolderKanban },
        { name: 'Chat', path: '/chat', icon: MessageCircle },
        { name: 'Profile', path: '/profile', icon: Settings },
    ];

    if (user?.role === 'admin') {
        navItems.splice(2, 0, { name: 'Admin Tasks', path: '/admin-tasks', icon: ClipboardList });
        navItems.push({ name: 'Admin Panel', path: '/admin', icon: Shield });
    }

    const isActive = (path) => location.pathname.startsWith(path);

    if (!isOpen) return null;

    return (
        <>
            {/* Mobile overlay */}
            <div
                className="fixed inset-0 bg-black/50 z-40 lg:hidden"
                onClick={onClose}
            />

            {/* Sidebar */}
            <motion.aside
                initial={{ x: -300 }}
                animate={{ x: 0 }}
                exit={{ x: -300 }}
                className="fixed left-0 top-0 h-full w-64 bg-white dark:bg-gray-800 shadow-lg z-50 flex flex-col"
            >
                {/* Logo */}
                <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                    <Link to="/dashboard" className="flex items-center space-x-2">
                        <div className="w-8 h-8 bg-gradient-to-br from-primary-500 to-purple-600 rounded-lg flex items-center justify-center">
                            <CheckSquare className="w-5 h-5 text-white" />
                        </div>
                        <span className="text-xl font-bold text-gray-800 dark:text-white">
                            TaskSphere
                        </span>
                    </Link>
                    <button
                        onClick={onClose}
                        className="lg:hidden text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Navigation */}
                <nav className="flex-1 p-4 space-y-1 overflow-y-auto custom-scrollbar">
                    {navItems.map((item) => {
                        const Icon = item.icon;
                        const active = isActive(item.path);
                        const isChat = item.path === '/chat';

                        return (
                            <Link
                                key={item.path}
                                to={item.path}
                                className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-all duration-200 relative ${active
                                    ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400'
                                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                                    }`}
                            >
                                <Icon className="w-5 h-5" />
                                <span className="font-medium">{item.name}</span>
                                {isChat && unreadCount > 0 && (
                                    <span className="absolute right-4 top-1/2 -translate-y-1/2 min-w-[20px] h-5 bg-red-500 text-white text-xs font-semibold rounded-full flex items-center justify-center px-1.5">
                                        {unreadCount > 99 ? '99+' : unreadCount}
                                    </span>
                                )}
                            </Link>
                        );
                    })}
                </nav>

                {/* User info */}
                <div className="p-4 border-t border-gray-200 dark:border-gray-700">
                    <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-500 to-purple-600 flex items-center justify-center text-white font-semibold">
                            {user?.name?.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                                {user?.name}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                                {user?.email}
                            </p>
                        </div>
                    </div>
                </div>
            </motion.aside>
        </>
    );
};

export default Sidebar;

