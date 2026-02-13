import { useState, useEffect, useRef } from 'react';
import {
    Send,
    Paperclip,
    Image as ImageIcon,
    File as FileIcon,
    Search,
    X,
    Check,
    CheckCheck,
    MoreVertical,
    Phone,
    Video,
    Smile,
    Download
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { userAPI, fileAPI, chatAPI } from '../services/api';
import { formatDate } from '../utils/helpers';
import toast from 'react-hot-toast';

const Chat = () => {
    const { user } = useAuth();
    const { socket } = useSocket();
    const [users, setUsers] = useState([]);
    const [filteredUsers, setFilteredUsers] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedUser, setSelectedUser] = useState(null);
    const [messages, setMessages] = useState([]);
    const [messageText, setMessageText] = useState('');
    const [typingUsers, setTypingUsers] = useState([]);
    const [onlineUsers, setOnlineUsers] = useState([]);
    const [showAttachmentMenu, setShowAttachmentMenu] = useState(false);
    const [uploadingFile, setUploadingFile] = useState(false);
    const [loadingMessages, setLoadingMessages] = useState(false);

    const messagesEndRef = useRef(null);
    const fileInputRef = useRef(null);
    const imageInputRef = useRef(null);


    // Fetch all users for chat
    useEffect(() => {
        fetchUsers();
    }, []);

    // Socket event listeners
    useEffect(() => {
        if (socket?.socket) {
            const socketInstance = socket.socket;

            socketInstance.on('chat:message', handleReceiveMessage);
            socketInstance.on('chat:message-sent', handleMessageSent);
            socketInstance.on('chat:typing', handleTypingIndicator);
            socketInstance.on('user:online', handleUserOnline);
            socketInstance.on('user:offline', handleUserOffline);
            socketInstance.on('users:active', handleActiveUsers);

            return () => {
                socketInstance.off('chat:message', handleReceiveMessage);
                socketInstance.off('chat:message-sent', handleMessageSent);
                socketInstance.off('chat:typing', handleTypingIndicator);
                socketInstance.off('user:online', handleUserOnline);
                socketInstance.off('user:offline', handleUserOffline);
                socketInstance.off('users:active', handleActiveUsers);
            };
        }
    }, [socket, selectedUser]);

    // Auto-scroll to bottom when messages change
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // Filter users based on search
    useEffect(() => {
        if (searchQuery.trim()) {
            const filtered = users.filter(u =>
                u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                u.email.toLowerCase().includes(searchQuery.toLowerCase())
            );
            setFilteredUsers(filtered);
        } else {
            setFilteredUsers(users);
        }
    }, [searchQuery, users]);

    const fetchUsers = async () => {
        try {
            const response = await userAPI.getUsersForChat();
            const allUsers = response.data.users;
            setUsers(allUsers);
            setFilteredUsers(allUsers);
        } catch (error) {
            console.error('Error fetching users:', error);
            toast.error('Failed to load users');
        }
    };

    const handleReceiveMessage = (message) => {
        console.log('📨 Received message:', message);
        if (selectedUser &&
            (message.sender._id === selectedUser._id || message.recipient === selectedUser._id)) {
            setMessages(prev => [...prev, message]);

            // Show toast notification if not already on this chat
            if (message.sender._id !== user._id) {
                toast.success(`New message from ${message.sender.name}`);
            }
        } else if (message.sender._id !== user._id) {
            // Message from another user, show notification
            toast(`New message from ${message.sender.name}`, {
                icon: '💬',
            });
        }
    };

    const handleTypingIndicator = ({ userId, userName }) => {
        if (selectedUser && userId === selectedUser._id) {
            setTypingUsers(prev => {
                if (!prev.includes(userName)) {
                    return [...prev, userName];
                }
                return prev;
            });

            setTimeout(() => {
                setTypingUsers(prev => prev.filter(u => u !== userName));
            }, 3000);
        }
    };

    const handleUserOnline = ({ userId }) => {
        setOnlineUsers(prev => [...new Set([...prev, userId])]);
    };

    const handleUserOffline = ({ userId }) => {
        setOnlineUsers(prev => prev.filter(id => id !== userId));
    };

    const handleActiveUsers = (userIds) => {
        setOnlineUsers(userIds);
    };

    const handleUserSelect = async (selectedUser) => {
        setSelectedUser(selectedUser);
        setMessages([]);

        // Load chat history
        await loadChatHistory(selectedUser._id);

        // Mark messages as read
        try {
            await chatAPI.markAsRead(selectedUser._id);

            // Notify that messages were marked as read (for unread count update)
            if (socket) {
                socket.emit('chat:messages-marked-read', { userId: selectedUser._id });
            }
        } catch (error) {
            console.error('Error marking messages as read:', error);
        }
    };

    const loadChatHistory = async (userId) => {
        setLoadingMessages(true);
        try {
            const response = await chatAPI.getMessages(userId);
            setMessages(response.data.messages);
        } catch (error) {
            console.error('Error loading chat history:', error);
            toast.error('Failed to load messages');
        } finally {
            setLoadingMessages(false);
        }
    };

    const handleMessageSent = (message) => {
        // Update local message with server ID
        setMessages(prev => {
            const lastMsg = prev[prev.length - 1];
            if (lastMsg && !lastMsg._id && lastMsg.content === message.content) {
                return [...prev.slice(0, -1), message];
            }
            return prev;
        });
    };

    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (!messageText.trim() || !socket?.socket || !selectedUser) return;

        const message = {
            sender: {
                _id: user._id,
                name: user.name,
                avatar: user.avatar,
            },
            recipient: selectedUser._id,
            content: messageText,
            type: 'text',
            createdAt: new Date(),
            status: 'sent',
        };

        console.log('📤 Sending message:', message);

        // Emit to socket
        socket.socket.emit('chat:send-message', message);

        // Add to local messages
        setMessages(prev => [...prev, message]);
        setMessageText('');
    };

    const handleTyping = () => {
        if (socket?.socket && selectedUser) {
            socket.socket.emit('chat:typing', {
                recipientId: selectedUser._id,
                userId: user._id,
                userName: user.name
            });
        }
    };

    const handleFileUpload = async (file, type) => {
        if (!file || !selectedUser) return;

        setUploadingFile(true);
        try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('type', type);

            const response = await fileAPI.uploadFile(formData);

            const message = {
                sender: {
                    _id: user._id,
                    name: user.name,
                    avatar: user.avatar,
                },
                recipient: selectedUser._id,
                content: file.name,
                type: type,
                fileUrl: response.data.file.url,
                fileName: response.data.file.originalName,
                fileSize: response.data.file.size,
                createdAt: new Date(),
                status: 'sent',
            };

            console.log('📤 Sending file:', message);
            socket.socket.emit('chat:send-message', message);
            setMessages(prev => [...prev, message]);
            toast.success('File sent successfully');
        } catch (error) {
            console.error('Error uploading file:', error);
            toast.error('Failed to upload file');
        } finally {
            setUploadingFile(false);
            setShowAttachmentMenu(false);
        }
    };

    const handleImageSelect = (e) => {
        const file = e.target.files[0];
        if (file) {
            handleFileUpload(file, 'image');
        }
    };

    const handleFileSelect = (e) => {
        const file = e.target.files[0];
        if (file) {
            handleFileUpload(file, 'document');
        }
    };

    const isUserOnline = (userId) => onlineUsers.includes(userId);

    const getLastSeenTime = (userId) => {
        if (isUserOnline(userId)) return 'Online';
        return 'Last seen recently';
    };

    return (
        <div className="flex h-[calc(100vh-8rem)] bg-gray-50 dark:bg-gray-900 rounded-lg overflow-hidden shadow-lg">
            {/* Users List Sidebar */}
            <div className="w-full md:w-96 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col">
                {/* Header */}
                <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                        Messages
                    </h2>

                    {/* Search Bar */}
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search users..."
                            className="w-full pl-10 pr-4 py-2 bg-gray-100 dark:bg-gray-700 border-none rounded-lg text-gray-900 dark:text-white placeholder-gray-500 focus:ring-2 focus:ring-primary-500 focus:outline-none"
                        />
                        {searchQuery && (
                            <button
                                onClick={() => setSearchQuery('')}
                                className="absolute right-3 top-1/2 transform -translate-y-1/2"
                            >
                                <X className="w-4 h-4 text-gray-400 hover:text-gray-600" />
                            </button>
                        )}
                    </div>
                </div>

                {/* Users List */}
                <div className="flex-1 overflow-y-auto custom-scrollbar">
                    {filteredUsers.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-gray-500 dark:text-gray-400">
                            <Search className="w-12 h-12 mb-2 opacity-50" />
                            <p>No users found</p>
                        </div>
                    ) : (
                        filteredUsers.map((chatUser) => (
                            <button
                                key={chatUser._id}
                                onClick={() => handleUserSelect(chatUser)}
                                className={`w-full p-4 flex items-center gap-3 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${selectedUser?._id === chatUser._id
                                    ? 'bg-primary-50 dark:bg-primary-900/20 border-l-4 border-primary-500'
                                    : ''
                                    }`}
                            >
                                <div className="relative">
                                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary-500 to-purple-600 flex items-center justify-center text-white font-semibold text-lg">
                                        {chatUser.name?.charAt(0).toUpperCase()}
                                    </div>
                                    {isUserOnline(chatUser._id) && (
                                        <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white dark:border-gray-800"></div>
                                    )}
                                </div>
                                <div className="flex-1 text-left">
                                    <div className="flex items-center justify-between">
                                        <h3 className="font-semibold text-gray-900 dark:text-white">
                                            {chatUser.name}
                                        </h3>
                                    </div>
                                    <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                                        {isUserOnline(chatUser._id) ? 'Online' : chatUser.email}
                                    </p>
                                </div>
                            </button>
                        ))
                    )}
                </div>
            </div>

            {/* Chat Area */}
            {selectedUser ? (
                <div className="flex-1 flex flex-col bg-[#f0f2f5] dark:bg-gray-900">
                    {/* Chat Header */}
                    <div className="bg-white dark:bg-gray-800 p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="relative">
                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-500 to-purple-600 flex items-center justify-center text-white font-semibold">
                                    {selectedUser.name?.charAt(0).toUpperCase()}
                                </div>
                                {isUserOnline(selectedUser._id) && (
                                    <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white dark:border-gray-800"></div>
                                )}
                            </div>
                            <div>
                                <h3 className="font-semibold text-gray-900 dark:text-white">
                                    {selectedUser.name}
                                </h3>
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                    {getLastSeenTime(selectedUser._id)}
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <button className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors">
                                <Phone className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                            </button>
                            <button className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors">
                                <Video className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                            </button>
                            <button className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors">
                                <MoreVertical className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                            </button>
                        </div>
                    </div>

                    {/* Messages Area */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjQwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZGVmcz48cGF0dGVybiBpZD0iYSIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSIgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIiBwYXR0ZXJuVHJhbnNmb3JtPSJyb3RhdGUoNDUpIj48cGF0aCBkPSJNLTEwIDMwaDYwdjJoLTYweiIgZmlsbD0iI2YwZjBmMCIgZmlsbC1vcGFjaXR5PSIuMDUiLz48L3BhdHRlcm4+PC9kZWZzPjxyZWN0IHdpZHRoPSI0MDAiIGhlaWdodD0iNDAwIiBmaWxsPSJ1cmwoI2EpIi8+PC9zdmc+')] dark:bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjQwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZGVmcz48cGF0dGVybiBpZD0iYSIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSIgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIiBwYXR0ZXJuVHJhbnNmb3JtPSJyb3RhdGUoNDUpIj48cGF0aCBkPSJNLTEwIDMwaDYwdjJoLTYweiIgZmlsbD0iIzMzMzMzMyIgZmlsbC1vcGFjaXR5PSIuMDUiLz48L3BhdHRlcm4+PC9kZWZzPjxyZWN0IHdpZHRoPSI0MDAiIGhlaWdodD0iNDAwIiBmaWxsPSJ1cmwoI2EpIi8+PC9zdmc+')]">
                        {loadingMessages ? (
                            <div className="flex flex-col items-center justify-center h-full">
                                <div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin mb-4"></div>
                                <p className="text-gray-500 dark:text-gray-400">Loading messages...</p>
                            </div>
                        ) : messages.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full text-gray-500 dark:text-gray-400">
                                <div className="w-20 h-20 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center mb-4">
                                    <Send className="w-10 h-10 opacity-50" />
                                </div>
                                <p className="text-lg font-medium">No messages yet</p>
                                <p className="text-sm">Send a message to start the conversation</p>
                            </div>
                        ) : (
                            <>
                                {messages.map((message, index) => {
                                    const isOwnMessage = message.sender._id === user._id;
                                    const showAvatar = !isOwnMessage && (
                                        index === 0 ||
                                        messages[index - 1].sender._id !== message.sender._id
                                    );

                                    return (
                                        <div
                                            key={index}
                                            className={`flex items-end gap-2 ${isOwnMessage ? 'justify-end' : 'justify-start'}`}
                                        >
                                            {!isOwnMessage && (
                                                <div className="w-8 h-8">
                                                    {showAvatar && (
                                                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-500 to-purple-600 flex items-center justify-center text-white font-semibold text-xs">
                                                            {message.sender.name?.charAt(0).toUpperCase()}
                                                        </div>
                                                    )}
                                                </div>
                                            )}

                                            <div className={`max-w-[70%] ${isOwnMessage ? 'order-1' : 'order-2'}`}>
                                                {message.type === 'text' ? (
                                                    <div
                                                        className={`${isOwnMessage
                                                            ? 'bg-[#dcf8c6] dark:bg-primary-900 text-gray-900 dark:text-white rounded-tl-lg rounded-tr-lg rounded-bl-lg'
                                                            : 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-tl-lg rounded-tr-lg rounded-br-lg'
                                                            } px-4 py-2 shadow-sm`}
                                                    >
                                                        <p className="text-sm break-words">{message.content}</p>
                                                        <div className="flex items-center justify-end gap-1 mt-1">
                                                            <span className="text-xs text-gray-500 dark:text-gray-400">
                                                                {formatDate(message.createdAt)}
                                                            </span>
                                                            {isOwnMessage && (
                                                                <span className="text-primary-600 dark:text-primary-400">
                                                                    {message.status === 'read' ? (
                                                                        <CheckCheck className="w-4 h-4" />
                                                                    ) : (
                                                                        <Check className="w-4 h-4" />
                                                                    )}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                ) : message.type === 'image' ? (
                                                    <div
                                                        className={`${isOwnMessage
                                                            ? 'bg-[#dcf8c6] dark:bg-primary-900 rounded-tl-lg rounded-tr-lg rounded-bl-lg'
                                                            : 'bg-white dark:bg-gray-700 rounded-tl-lg rounded-tr-lg rounded-br-lg'
                                                            } p-2 shadow-sm`}
                                                    >
                                                        <img
                                                            src={message.fileUrl}
                                                            alt={message.fileName}
                                                            className="max-w-full rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                                                            onClick={() => window.open(message.fileUrl, '_blank')}
                                                        />
                                                        <div className="flex items-center justify-between mt-1 px-2">
                                                            <span className="text-xs text-gray-500 dark:text-gray-400">
                                                                {formatDate(message.createdAt)}
                                                            </span>
                                                            {isOwnMessage && (
                                                                <CheckCheck className="w-4 h-4 text-primary-600 dark:text-primary-400" />
                                                            )}
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div
                                                        className={`${isOwnMessage
                                                            ? 'bg-[#dcf8c6] dark:bg-primary-900 rounded-tl-lg rounded-tr-lg rounded-bl-lg'
                                                            : 'bg-white dark:bg-gray-700 rounded-tl-lg rounded-tr-lg rounded-br-lg'
                                                            } px-4 py-3 shadow-sm`}
                                                    >
                                                        <div className="flex items-center gap-3">
                                                            <div className="p-2 bg-gray-200 dark:bg-gray-600 rounded-lg">
                                                                <FileIcon className="w-6 h-6 text-gray-700 dark:text-gray-300" />
                                                            </div>
                                                            <div className="flex-1">
                                                                <p className="text-sm font-medium text-gray-900 dark:text-white">
                                                                    {message.fileName}
                                                                </p>
                                                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                                                    {(message.fileSize / 1024).toFixed(2)} KB
                                                                </p>
                                                            </div>
                                                            <a
                                                                href={message.fileUrl}
                                                                download
                                                                className="p-2 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-full transition-colors"
                                                            >
                                                                <Download className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                                                            </a>
                                                        </div>
                                                        <div className="flex items-center justify-between mt-2">
                                                            <span className="text-xs text-gray-500 dark:text-gray-400">
                                                                {formatDate(message.createdAt)}
                                                            </span>
                                                            {isOwnMessage && (
                                                                <CheckCheck className="w-4 h-4 text-primary-600 dark:text-primary-400" />
                                                            )}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}

                                {typingUsers.length > 0 && (
                                    <div className="flex items-center gap-2">
                                        <div className="w-8 h-8"></div>
                                        <div className="bg-white dark:bg-gray-700 rounded-lg px-4 py-2 shadow-sm">
                                            <div className="flex gap-1">
                                                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                                                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                                                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                                <div ref={messagesEndRef} />
                            </>
                        )}
                    </div>

                    {/* Message Input */}
                    <div className="bg-white dark:bg-gray-800 p-4 border-t border-gray-200 dark:border-gray-700">
                        <form onSubmit={handleSendMessage} className="flex items-center gap-2">
                            {/* Attachment Button */}
                            <div className="relative">
                                <button
                                    type="button"
                                    onClick={() => setShowAttachmentMenu(!showAttachmentMenu)}
                                    disabled={uploadingFile}
                                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors disabled:opacity-50"
                                >
                                    <Paperclip className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                                </button>

                                {showAttachmentMenu && (
                                    <div className="absolute bottom-full left-0 mb-2 bg-white dark:bg-gray-700 rounded-lg shadow-lg border border-gray-200 dark:border-gray-600 py-2 min-w-[150px]">
                                        <button
                                            type="button"
                                            onClick={() => imageInputRef.current?.click()}
                                            className="w-full flex items-center gap-3 px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                                        >
                                            <ImageIcon className="w-5 h-5 text-purple-600" />
                                            <span className="text-sm text-gray-700 dark:text-gray-300">Image</span>
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => fileInputRef.current?.click()}
                                            className="w-full flex items-center gap-3 px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                                        >
                                            <FileIcon className="w-5 h-5 text-blue-600" />
                                            <span className="text-sm text-gray-700 dark:text-gray-300">Document</span>
                                        </button>
                                    </div>
                                )}

                                <input
                                    ref={imageInputRef}
                                    type="file"
                                    accept="image/*"
                                    onChange={handleImageSelect}
                                    className="hidden"
                                />
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept=".pdf,.doc,.docx,.txt,.xlsx,.xls"
                                    onChange={handleFileSelect}
                                    className="hidden"
                                />
                            </div>

                            {/* Emoji Button */}
                            <button
                                type="button"
                                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
                            >
                                <Smile className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                            </button>

                            {/* Message Input */}
                            <input
                                type="text"
                                value={messageText}
                                onChange={(e) => setMessageText(e.target.value)}
                                onKeyPress={handleTyping}
                                placeholder="Type a message..."
                                disabled={uploadingFile}
                                className="flex-1 px-4 py-2 bg-gray-100 dark:bg-gray-700 rounded-full border-none text-gray-900 dark:text-white placeholder-gray-500 focus:ring-2 focus:ring-primary-500 focus:outline-none disabled:opacity-50"
                            />

                            {/* Send Button */}
                            <button
                                type="submit"
                                disabled={!messageText.trim() || uploadingFile}
                                className="p-2 bg-primary-600 hover:bg-primary-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-full transition-colors"
                            >
                                <Send className="w-5 h-5" />
                            </button>
                        </form>

                        {uploadingFile && (
                            <div className="mt-2 text-sm text-gray-500 dark:text-gray-400 flex items-center gap-2">
                                <div className="w-4 h-4 border-2 border-primary-600 border-t-transparent rounded-full animate-spin"></div>
                                Uploading file...
                            </div>
                        )}
                    </div>
                </div>
            ) : (
                <div className="flex-1 flex flex-col items-center justify-center bg-[#f0f2f5] dark:bg-gray-900 text-gray-500 dark:text-gray-400">
                    <div className="w-32 h-32 rounded-full bg-gradient-to-br from-primary-500 to-purple-600 flex items-center justify-center mb-6 opacity-50">
                        <Send className="w-16 h-16 text-white" />
                    </div>
                    <h2 className="text-2xl font-semibold mb-2 text-gray-700 dark:text-gray-300">
                        Welcome to Chat
                    </h2>
                    <p className="text-center max-w-md">
                        Select a user from the list to start messaging
                    </p>
                </div>
            )}
        </div>
    );
};

export default Chat;
