import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Users, Calendar, TrendingUp, Plus, Send, X, MessageSquare, Layout } from 'lucide-react';
import { projectAPI, taskAPI, userAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import Button from '../components/ui/Button';
import Card, { CardHeader, CardBody } from '../components/ui/Card';
import { PriorityBadge, StatusBadge } from '../components/ui/Badge';
import Modal from '../components/ui/Modal';
import Input from '../components/ui/Input';
import Textarea from '../components/ui/Textarea';
import Select from '../components/ui/Select';
import TaskKanban from '../components/TaskKanban';
import { formatDate, formatRelativeTime } from '../utils/helpers';
import toast from 'react-hot-toast';

const ProjectDetails = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const { socket } = useSocket();
    const [project, setProject] = useState(null);
    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showMemberModal, setShowMemberModal] = useState(false);
    const [showAddMemberModal, setShowAddMemberModal] = useState(false);
    const [showTaskModal, setShowTaskModal] = useState(false);
    const [editingTask, setEditingTask] = useState(null);
    const [viewMode, setViewMode] = useState('kanban'); // 'list' or 'kanban'
    const [memberEmail, setMemberEmail] = useState('');
    const [allUsers, setAllUsers] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');

    // Task form state
    const [taskForm, setTaskForm] = useState({
        title: '',
        description: '',
        priority: 'medium',
        status: 'todo',
        assignedTo: [],
        assignToAll: false,
        dueDate: '',
    });

    // Chat state
    const [messages, setMessages] = useState([]);
    const [messagesLoaded, setMessagesLoaded] = useState(false);
    const [newMessage, setNewMessage] = useState('');
    const [typingUsers, setTypingUsers] = useState([]);
    const [showChat, setShowChat] = useState(false);
    const [chatType, setChatType] = useState('group'); // 'group' or 'direct'
    const [selectedChatMember, setSelectedChatMember] = useState(null);
    const messagesEndRef = useRef(null);
    const typingTimeoutRef = useRef(null);

    useEffect(() => {
        fetchProject();
        fetchProjectTasks();
        fetchUsers();

        // Join project room for real-time updates
        if (socket && id) {
            socket.joinProjectRoom(id);

            // Listen for new messages
            socket.onProjectMessage((message) => {
                setMessages(prev => {
                    // Prevent duplicates by checking if message already exists
                    const messageId = message._id?.toString();
                    const exists = prev.some(m => m._id?.toString() === messageId);
                    if (exists) return prev;
                    return [...prev, message];
                });
                scrollToBottom();
            });

            // Listen for typing indicator
            socket.onProjectUserTyping((data) => {
                if (data.userId !== user._id) {
                    setTypingUsers(prev => {
                        if (data.isTyping) {
                            return [...prev.filter(u => u.userId !== data.userId), data];
                        } else {
                            return prev.filter(u => u.userId !== data.userId);
                        }
                    });

                    // Clear typing after 3 seconds
                    setTimeout(() => {
                        setTypingUsers(prev => prev.filter(u => u.userId !== data.userId));
                    }, 3000);
                }
            });

            // Listen for task assigned
            socket.on('task_assigned', (data) => {
                if (data.assignedTo === user._id) {
                    toast.success(`New task assigned: ${data.taskTitle}`);
                    fetchProjectTasks();
                }
            });

            // Listen for task completed
            socket.on('task_completed', (data) => {
                if (project?.owner === user._id) {
                    toast.success(`${data.completedBy} completed: ${data.taskTitle}`);
                }
                fetchProjectTasks();
            });

            // Listen for notification
            socket.on('notification:new', (notification) => {
                toast(notification.message, {
                    icon: notification.type === 'task_assigned' ? '📋' : '✅',
                });
            });

            return () => {
                socket.leaveProjectRoom(id);
                socket.socket?.off('task_assigned');
                socket.socket?.off('task_completed');
                socket.socket?.off('notification:new');
            };
        }
    }, [id, socket, user._id]);

    useEffect(() => {
        if (showChat && !messagesLoaded) {
            fetchMessages();
        }
    }, [showChat, messagesLoaded]);

    // Refetch messages when switching between chat types or selecting different members
    useEffect(() => {
        if (showChat && chatType === 'direct' && selectedChatMember) {
            // Messages already loaded, just filter them
            scrollToBottom();
        }
    }, [chatType, selectedChatMember, showChat]);

    const fetchProject = async () => {
        try {
            const { data } = await projectAPI.getProject(id);
            setProject(data.project);
        } catch (error) {
            toast.error('Failed to load project');
            navigate('/projects');
        } finally {
            setLoading(false);
        }
    };

    const fetchProjectTasks = async () => {
        try {
            const { data } = await taskAPI.getTasks({ project: id });
            setTasks(data.tasks || []);
        } catch (error) {
            console.error('Failed to load tasks');
        }
    };

    const fetchUsers = async () => {
        try {
            const { data } = await userAPI.getUsersForChat();
            setAllUsers(data.users || []);
        } catch (error) {
            console.error('Failed to load users');
        }
    };

    const fetchMessages = async () => {
        try {
            const { data } = await projectAPI.getMessages(id);
            setMessages(data.messages || []);
            setMessagesLoaded(true);
            scrollToBottom();
        } catch (error) {
            console.error('Failed to load messages');
        }
    };

    const scrollToBottom = () => {
        setTimeout(() => {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
    };

    const handleAddMember = async (userId) => {
        try {
            await projectAPI.inviteMember(id, { userId });
            toast.success('Invitation sent successfully');
            setShowAddMemberModal(false);
            setSearchQuery('');
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to send invitation');
        }
    };

    const handleRemoveMember = async (userId) => {
        if (!confirm('Are you sure you want to remove this member?')) return;

        try {
            await projectAPI.removeMember(id, userId);
            toast.success('Member removed successfully');
            fetchProject();
        } catch (error) {
            toast.error('Failed to remove member');
        }
    };

    const handleCreateTask = async (e) => {
        e.preventDefault();
        try {
            // Determine who to assign to
            let assignees = [];
            if (taskForm.assignToAll) {
                // Assign to all team members
                assignees = project.members.map(m => m.user._id);
            } else if (Array.isArray(taskForm.assignedTo)) {
                assignees = taskForm.assignedTo;
            } else if (taskForm.assignedTo) {
                assignees = [taskForm.assignedTo];
            }

            // Create task for each assignee or unassigned task
            if (assignees.length > 0) {
                for (const assigneeId of assignees) {
                    const taskData = {
                        title: taskForm.title,
                        description: taskForm.description,
                        priority: taskForm.priority,
                        status: taskForm.status,
                        dueDate: taskForm.dueDate,
                        project: id,
                        createdBy: user._id,
                        assignedTo: assigneeId,
                    };

                    if (editingTask) {
                        await taskAPI.updateTask(editingTask._id, taskData);
                    } else {
                        const { data } = await taskAPI.createTask(taskData);

                        // Emit socket event for task assignment
                        if (socket) {
                            socket.emit('task_assigned', {
                                projectId: id,
                                taskId: data.task._id,
                                taskTitle: taskData.title,
                                assignedTo: assigneeId,
                                assignedBy: user.name,
                            });
                        }
                    }
                }
            } else {
                // Create unassigned task
                const taskData = {
                    title: taskForm.title,
                    description: taskForm.description,
                    priority: taskForm.priority,
                    status: taskForm.status,
                    dueDate: taskForm.dueDate,
                    project: id,
                    createdBy: user._id,
                };

                if (editingTask) {
                    await taskAPI.updateTask(editingTask._id, taskData);
                } else {
                    await taskAPI.createTask(taskData);
                }
            }

            toast.success(editingTask ? 'Task updated successfully' : 'Task(s) created successfully');
            setShowTaskModal(false);
            setEditingTask(null);
            setTaskForm({
                title: '',
                description: '',
                priority: 'medium',
                status: 'todo',
                assignedTo: [],
                assignToAll: false,
                dueDate: '',
            });
            fetchProjectTasks();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to create task');
        }
    };

    const handleEditTask = (task) => {
        setEditingTask(task);
        setTaskForm({
            title: task.title,
            description: task.description || '',
            priority: task.priority,
            status: task.status,
            assignedTo: task.assignedTo?._id ? [task.assignedTo._id] : [],
            assignToAll: false,
            dueDate: task.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : '',
        });
        setShowTaskModal(true);
    };

    const handleDeleteTask = async (taskId) => {
        if (!confirm('Are you sure you want to delete this task?')) return;

        try {
            await taskAPI.deleteTask(taskId);
            toast.success('Task deleted successfully');
            fetchProjectTasks();
        } catch (error) {
            toast.error('Failed to delete task');
        }
    };

    const handleUpdateTaskStatus = async (taskId, newStatus) => {
        try {
            const task = tasks.find(t => t._id === taskId);
            await taskAPI.updateTask(taskId, { status: newStatus });

            // Emit socket event for task completion
            if (newStatus === 'completed' && socket) {
                socket.emit('task_completed', {
                    projectId: id,
                    taskId,
                    taskTitle: task.title,
                    completedBy: user.name,
                });
            }

            fetchProjectTasks();
        } catch (error) {
            toast.error('Failed to update task status');
        }
    };

    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (!newMessage.trim()) return;

        try {
            // For now, direct messages are sent through the same project message system
            // They can be filtered on the frontend by sender/recipient
            await projectAPI.sendMessage(id, {
                message: newMessage,
                // Add metadata for direct messages (backend will ignore if not supported)
                recipientId: chatType === 'direct' ? selectedChatMember?._id : null
            });
            setNewMessage('');

            // Clear typing indicator
            if (socket) {
                socket.emitProjectTyping(id, false, user?.name);
            }
        } catch (error) {
            toast.error('Failed to send message');
        }
    };

    const handleTyping = (e) => {
        setNewMessage(e.target.value);

        if (socket) {
            // Clear previous timeout
            if (typingTimeoutRef.current) {
                clearTimeout(typingTimeoutRef.current);
            }

            // Emit typing
            socket.emitProjectTyping(id, true, user?.name);

            // Stop typing after 2 seconds
            typingTimeoutRef.current = setTimeout(() => {
                socket.emitProjectTyping(id, false, user?.name);
            }, 2000);
        }
    };

    const isAdmin = user?.role === 'admin';
    const isOwner = project?.owner?._id === user?._id;
    const canManageMembers = isAdmin || isOwner;

    const filteredUsers = allUsers.filter(u => {
        const isMember = project?.members?.some(m => m.user?._id === u._id);
        const matchesSearch = u.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            u.email?.toLowerCase().includes(searchQuery.toLowerCase());
        const isAdmin = u.role === 'admin';
        return !isMember && matchesSearch && !isAdmin;
    });

    // Filter messages based on chat type
    const displayMessages = chatType === 'direct' && selectedChatMember
        ? messages.filter(msg => {
            // Convert to strings for comparison
            const msgSenderId = msg.sender?._id?.toString() || msg.sender?.toString();
            const msgRecipientId = msg.recipientId?.toString();
            const currentUserId = user._id?.toString();
            const selectedMemberId = selectedChatMember._id?.toString();

            // Show direct messages between current user and selected member
            const isToSelectedMember = msgSenderId === currentUserId && msgRecipientId === selectedMemberId;
            const isFromSelectedMember = msgSenderId === selectedMemberId && msgRecipientId === currentUserId;
            return isToSelectedMember || isFromSelectedMember;
        })
        : messages.filter(msg => !msg.recipientId); // For group chat, only show messages without recipientId

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
            </div>
        );
    }

    if (!project) return null;

    const completedTasks = tasks.filter((t) => t.status === 'completed').length;
    const progressPercentage = tasks.length > 0 ? (completedTasks / tasks.length) * 100 : 0;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => navigate('/projects')}
                        className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
                    >
                        <ArrowLeft className="w-6 h-6" />
                    </button>
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                            {project.name}
                        </h1>
                        <p className="text-gray-600 dark:text-gray-400 mt-1">{project.description}</p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <Button
                        variant="secondary"
                        onClick={() => {
                            setChatType('group');
                            setSelectedChatMember(null);
                            setShowChat(true);
                        }}
                        icon={<MessageSquare className="w-5 h-5" />}
                    >
                        Chat
                    </Button>
                    {canManageMembers && (
                        <Button
                            onClick={() => setShowAddMemberModal(true)}
                            icon={<Users className="w-5 h-5" />}
                        >
                            Invite Member
                        </Button>
                    )}
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <Card>
                    <CardBody>
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-600 dark:text-gray-400">Progress</p>
                                <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                                    {progressPercentage.toFixed(0)}%
                                </p>
                            </div>
                            <TrendingUp className="w-8 h-8 text-green-600" />
                        </div>
                    </CardBody>
                </Card>

                <Card>
                    <CardBody>
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-600 dark:text-gray-400">Total Tasks</p>
                                <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                                    {tasks.length}
                                </p>
                            </div>
                        </div>
                    </CardBody>
                </Card>

                <Card>
                    <CardBody>
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-600 dark:text-gray-400">Completed</p>
                                <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                                    {completedTasks}
                                </p>
                            </div>
                        </div>
                    </CardBody>
                </Card>

                <Card>
                    <CardBody>
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-600 dark:text-gray-400">Members</p>
                                <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                                    {project.members?.length || 0}
                                </p>
                            </div>
                            <Users className="w-8 h-8 text-blue-600" />
                        </div>
                    </CardBody>
                </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Tasks */}
                <div className="lg:col-span-2">
                    <Card>
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Tasks</h3>
                                <div className="flex gap-2">
                                    <Button
                                        size="sm"
                                        variant={viewMode === 'kanban' ? 'primary' : 'secondary'}
                                        onClick={() => setViewMode('kanban')}
                                        icon={<Layout className="w-4 h-4" />}
                                    >
                                        Kanban
                                    </Button>
                                    {canManageMembers && (
                                        <Button
                                            size="sm"
                                            onClick={() => {
                                                setEditingTask(null);
                                                setTaskForm({
                                                    title: '',
                                                    description: '',
                                                    priority: 'medium',
                                                    status: 'todo',
                                                    assignedTo: [],
                                                    assignToAll: false,
                                                    dueDate: '',
                                                });
                                                setShowTaskModal(true);
                                            }}
                                            icon={<Plus className="w-4 h-4" />}
                                        >
                                            New Task
                                        </Button>
                                    )}
                                </div>
                            </div>
                        </CardHeader>
                        <CardBody>
                            {viewMode === 'kanban' ? (
                                <TaskKanban
                                    tasks={tasks}
                                    onEditTask={handleEditTask}
                                    onDeleteTask={handleDeleteTask}
                                    onUpdateStatus={handleUpdateTaskStatus}
                                    isAdmin={canManageMembers}
                                />
                            ) : (
                                <div className="space-y-3">
                                    {tasks.length === 0 ? (
                                        <p className="text-center text-gray-500 dark:text-gray-400 py-8">
                                            No tasks yet
                                        </p>
                                    ) : (
                                        tasks.map((task) => (
                                            <div
                                                key={task._id}
                                                onClick={() => navigate(`/tasks/${task._id}`)}
                                                className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer"
                                            >
                                                <div className="flex items-start justify-between">
                                                    <div className="flex-1">
                                                        <h4 className="font-medium text-gray-900 dark:text-white">
                                                            {task.title}
                                                        </h4>
                                                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                                            {task.description?.substring(0, 100)}
                                                        </p>
                                                    </div>
                                                    <div className="flex items-center space-x-2 ml-4">
                                                        <PriorityBadge priority={task.priority} />
                                                        <StatusBadge status={task.status} />
                                                    </div>
                                                </div>
                                                {task.dueDate && (
                                                    <div className="flex items-center text-xs text-gray-500 dark:text-gray-400 mt-2">
                                                        <Calendar className="w-3 h-3 mr-1" />
                                                        Due: {formatDate(task.dueDate)}
                                                    </div>
                                                )}
                                            </div>
                                        ))
                                    )}
                                </div>
                            )}
                        </CardBody>
                    </Card>
                </div>



                {/* Members */}
                <div className="lg:col-span-1">
                    <Card>
                        <CardHeader>
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                                Team Members
                            </h3>
                        </CardHeader>
                        <CardBody>
                            <div className="space-y-3">
                                {project.members?.map((member) => (
                                    <div
                                        key={member.user._id}
                                        className="flex items-center justify-between p-3 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-500 to-purple-600 flex items-center justify-center text-white font-semibold">
                                                {member.user.name?.charAt(0).toUpperCase()}
                                            </div>
                                            <div>
                                                <p className="font-medium text-gray-900 dark:text-white">
                                                    {member.user.name}
                                                </p>
                                                <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">
                                                    {member.role}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {member.user._id !== user._id && (
                                                <button
                                                    onClick={() => {
                                                        setSelectedChatMember(member.user);
                                                        setChatType('direct');
                                                        setShowChat(true);
                                                    }}
                                                    className="p-1.5 text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-lg transition-colors"
                                                    title="Chat with member"
                                                >
                                                    <MessageSquare className="w-4 h-4" />
                                                </button>
                                            )}
                                            {canManageMembers && member.role !== 'owner' && (
                                                <button
                                                    onClick={() => handleRemoveMember(member.user._id)}
                                                    className="text-red-600 hover:text-red-800 text-sm"
                                                >
                                                    Remove
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardBody>
                    </Card>
                </div>
            </div>

            {/* Add Member Modal */}
            <Modal
                isOpen={showAddMemberModal}
                onClose={() => {
                    setShowAddMemberModal(false);
                    setSearchQuery('');
                }}
                title="Invite Team Member"
            >
                <div className="space-y-4">
                    <Input
                        label="Search Users"
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search by name or email..."
                    />

                    <div className="max-h-[400px] overflow-y-auto space-y-2 custom-scrollbar">
                        {filteredUsers.length === 0 ? (
                            <p className="text-center text-gray-500 dark:text-gray-400 py-8">
                                {searchQuery ? 'No users found' : 'All users are already members'}
                            </p>
                        ) : (
                            filteredUsers.map((u) => (
                                <div
                                    key={u._id}
                                    className="flex items-center justify-between p-3 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-500 to-purple-600 flex items-center justify-center text-white font-semibold">
                                            {u.name?.charAt(0).toUpperCase()}
                                        </div>
                                        <div>
                                            <p className="font-medium text-gray-900 dark:text-white">
                                                {u.name}
                                            </p>
                                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                                {u.email}
                                            </p>
                                        </div>
                                    </div>
                                    <Button size="sm" onClick={() => handleAddMember(u._id)}>
                                        Invite
                                    </Button>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </Modal>

            {/* Create/Edit Task Modal */}
            <Modal
                isOpen={showTaskModal}
                onClose={() => {
                    setShowTaskModal(false);
                    setEditingTask(null);
                }}
                title={editingTask ? 'Edit Task' : 'Create New Task'}
            >
                <form onSubmit={handleCreateTask} className="space-y-4">
                    <Input
                        label="Task Title"
                        value={taskForm.title}
                        onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })}
                        required
                    />
                    <Textarea
                        label="Description"
                        value={taskForm.description}
                        onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })}
                        rows={3}
                    />
                    <div className="grid grid-cols-2 gap-4">
                        <Select
                            label="Priority"
                            value={taskForm.priority}
                            onChange={(e) => setTaskForm({ ...taskForm, priority: e.target.value })}
                        >
                            <option value="low">Low</option>
                            <option value="medium">Medium</option>
                            <option value="high">High</option>
                            <option value="urgent">Urgent</option>
                        </Select>
                        <Select
                            label="Status"
                            value={taskForm.status}
                            onChange={(e) => setTaskForm({ ...taskForm, status: e.target.value })}
                        >
                            <option value="todo">To Do</option>
                            <option value="in-progress">In Progress</option>
                            <option value="review">Review</option>
                            <option value="completed">Completed</option>
                        </Select>
                    </div>
                    <div className="space-y-3">
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={taskForm.assignToAll}
                                onChange={(e) => setTaskForm({ ...taskForm, assignToAll: e.target.checked, assignedTo: [] })}
                                className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                            />
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                Assign to all team members
                            </span>
                        </label>

                        {!taskForm.assignToAll && (
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Assign To (Hold Ctrl/Cmd to select multiple)
                                </label>
                                <select
                                    multiple
                                    value={taskForm.assignedTo}
                                    onChange={(e) => {
                                        const selected = Array.from(e.target.selectedOptions, option => option.value);
                                        setTaskForm({ ...taskForm, assignedTo: selected });
                                    }}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                                    size="5"
                                >
                                    {project?.members?.map((member) => (
                                        <option key={member.user._id} value={member.user._id}>
                                            {member.user.name}
                                        </option>
                                    ))}
                                </select>
                                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                    {taskForm.assignedTo.length > 0
                                        ? `${taskForm.assignedTo.length} member(s) selected`
                                        : 'Select one or more members, or leave empty for unassigned'}
                                </p>
                            </div>
                        )}
                    </div>
                    <Input
                        label="Due Date"
                        type="date"
                        value={taskForm.dueDate}
                        onChange={(e) => setTaskForm({ ...taskForm, dueDate: e.target.value })}
                    />
                    <div className="flex justify-end gap-2">
                        <Button
                            type="button"
                            variant="secondary"
                            onClick={() => {
                                setShowTaskModal(false);
                                setEditingTask(null);
                            }}
                        >
                            Cancel
                        </Button>
                        <Button type="submit">
                            {editingTask ? 'Update Task' : 'Create Task'}
                        </Button>
                    </div>
                </form>
            </Modal>

            {/* Chat Modal */}
            <Modal
                isOpen={showChat}
                onClose={() => {
                    setShowChat(false);
                    setSelectedChatMember(null);
                    setMessagesLoaded(false);
                }}
                title={
                    <div className="flex items-center gap-2">
                        <MessageSquare className="w-5 h-5" />
                        {chatType === 'group' ? 'Project Chat' : `Chat with ${selectedChatMember?.name || ''}`}
                    </div>
                }
                size="lg"
            >
                <div className="space-y-4">
                    {/* Chat Type Selector */}
                    <div className="flex gap-2 p-1 bg-gray-100 dark:bg-gray-800 rounded-lg">
                        <button
                            onClick={() => {
                                setChatType('group');
                                setSelectedChatMember(null);
                            }}
                            className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${chatType === 'group'
                                ? 'bg-white dark:bg-gray-700 text-primary-600 dark:text-primary-400 shadow-sm'
                                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                                }`}
                        >
                            Group Chat
                        </button>
                        <button
                            onClick={() => setChatType('direct')}
                            className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${chatType === 'direct'
                                ? 'bg-white dark:bg-gray-700 text-primary-600 dark:text-primary-400 shadow-sm'
                                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                                }`}
                        >
                            Direct Message
                        </button>
                    </div>

                    {/* Member Selection for Direct Chat */}
                    {chatType === 'direct' && !selectedChatMember && (
                        <div className="space-y-2">
                            <p className="text-sm text-gray-600 dark:text-gray-400">Select a member to chat with:</p>
                            <div className="max-h-60 overflow-y-auto space-y-2 custom-scrollbar">
                                {project?.members
                                    ?.filter(m => m.user._id !== user._id)
                                    ?.map((member) => (
                                        <button
                                            key={member.user._id}
                                            onClick={() => setSelectedChatMember(member.user)}
                                            className="w-full flex items-center gap-3 p-3 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                                        >
                                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-500 to-purple-600 flex items-center justify-center text-white font-semibold">
                                                {member.user.name?.charAt(0).toUpperCase()}
                                            </div>
                                            <div className="text-left">
                                                <p className="font-medium text-gray-900 dark:text-white">
                                                    {member.user.name}
                                                </p>
                                                <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">
                                                    {member.role}
                                                </p>
                                            </div>
                                        </button>
                                    ))}
                            </div>
                        </div>
                    )}

                    {/* Chat Messages */}
                    {(chatType === 'group' || selectedChatMember) && (
                        <>
                            <div className="h-[400px] overflow-y-auto p-4 bg-gray-50 dark:bg-gray-900 rounded-lg space-y-3 custom-scrollbar">
                                {displayMessages.length === 0 ? (
                                    <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400">
                                        <div className="text-center">
                                            <MessageSquare className="w-12 h-12 mx-auto mb-2 opacity-50" />
                                            <p className="text-sm">No messages yet. Start the conversation!</p>
                                        </div>
                                    </div>
                                ) : (
                                    displayMessages.map((msg, index) => (
                                        <div
                                            key={msg._id || `msg-${index}`}
                                            className={`flex ${msg.sender._id === user._id ? 'justify-end' : 'justify-start'}`}
                                        >
                                            <div className={`max-w-[75%] ${msg.sender._id === user._id
                                                ? 'bg-primary-600 text-white'
                                                : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-700'
                                                } rounded-lg p-3 shadow-sm`}>
                                                {chatType === 'group' && msg.sender._id !== user._id && (
                                                    <p className="text-xs font-semibold mb-1 opacity-90">
                                                        {msg.sender.name}
                                                    </p>
                                                )}
                                                <p className="text-sm">{msg.message}</p>
                                                <p className="text-xs mt-1 opacity-70">
                                                    {formatRelativeTime(msg.createdAt)}
                                                </p>
                                            </div>
                                        </div>
                                    ))
                                )}

                                {/* Typing indicator */}
                                {typingUsers.length > 0 && (
                                    <div className="text-sm text-gray-500 dark:text-gray-400 italic">
                                        {typingUsers[0].userName} is typing...
                                    </div>
                                )}

                                <div ref={messagesEndRef} />
                            </div>

                            {/* Message Input */}
                            <form onSubmit={handleSendMessage} className="flex gap-2">
                                <input
                                    type="text"
                                    value={newMessage}
                                    onChange={handleTyping}
                                    placeholder={`Message ${chatType === 'group' ? 'everyone' : selectedChatMember?.name || ''}...`}
                                    className="flex-1 px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                                    autoFocus
                                />
                                <Button type="submit" icon={<Send className="w-4 h-4" />}>
                                    Send
                                </Button>
                            </form>
                        </>
                    )}
                </div>
            </Modal>
        </div>
    );
};

export default ProjectDetails;
