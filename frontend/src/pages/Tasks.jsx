import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Search, Grid, List, Edit, Trash2, Clock, User, AlertCircle, CheckCircle2, Calendar, Tag } from 'lucide-react';
import { taskAPI, userAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import Badge, { PriorityBadge, StatusBadge } from '../components/ui/Badge';
import Modal from '../components/ui/Modal';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import Textarea from '../components/ui/Textarea';
import { formatDate } from '../utils/helpers';
import toast from 'react-hot-toast';

const Tasks = () => {
    const { user } = useAuth();
    const [tasks, setTasks] = useState([]);
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingTask, setEditingTask] = useState(null);
    const [viewMode, setViewMode] = useState('grid');
    const [searchTerm, setSearchTerm] = useState('');
    const [sortByDeadline, setSortByDeadline] = useState(false);
    const [filters, setFilters] = useState({ status: '', priority: '', assignedTo: '' });
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        priority: 'medium',
        status: 'todo',
        dueDate: '',
        assignedTo: '',
    });
    const [errors, setErrors] = useState({});

    useEffect(() => {
        fetchTasks();
        if (user?.role === 'admin') {
            fetchUsers();
        }
    }, [filters]);

    const fetchTasks = async () => {
        try {
            const { data } = await taskAPI.getTasks(filters);
            setTasks(data.tasks || []);
        } catch (error) {
            toast.error('Failed to load tasks');
        } finally {
            setLoading(false);
        }
    };

    const fetchUsers = async () => {
        try {
            const { data } = await userAPI.getAllUsers();
            setUsers(data.users || []);
        } catch (error) {
            console.error('Failed to load users');
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        // Clear previous errors
        setErrors({});

        // Validation
        const newErrors = {};

        if (!formData.title || !formData.title.trim()) {
            newErrors.title = 'Task title is required';
        } else if (formData.title.trim().length < 3) {
            newErrors.title = 'Task title must be at least 3 characters';
        } else if (formData.title.trim().length > 200) {
            newErrors.title = 'Task title cannot exceed 200 characters';
        }

        if (formData.dueDate) {
            const dueDate = new Date(formData.dueDate);
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            if (dueDate < today) {
                newErrors.dueDate = 'Due date cannot be in the past';
            }
        }

        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            toast.error('Please fix the validation errors');
            return;
        }

        try {
            const cleanData = { ...formData };
            if (!cleanData.assignedTo) {
                delete cleanData.assignedTo;
            }

            if (editingTask) {
                await taskAPI.updateTask(editingTask._id, cleanData);
                toast.success('Task updated successfully!');
            } else {
                await taskAPI.createTask(cleanData);
                toast.success('Task created successfully!');
            }
            setShowModal(false);
            setEditingTask(null);
            setFormData({ title: '', description: '', priority: 'medium', status: 'todo', dueDate: '', assignedTo: '' });
            setErrors({});
            fetchTasks();
        } catch (error) {
            const errorMessage = error.response?.data?.message || (editingTask ? 'Failed to update task' : 'Failed to create task');
            toast.error(errorMessage);
        }
    };

    const handleEditTask = (task) => {
        setEditingTask(task);
        setFormData({
            title: task.title,
            description: task.description || '',
            priority: task.priority,
            status: task.status,
            dueDate: task.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : '',
            assignedTo: task.assignedTo?._id || '',
        });
        setShowModal(true);
    };

    const handleDeleteTask = async (taskId) => {
        if (!confirm('Are you sure you want to delete this task?')) return;

        try {
            await taskAPI.deleteTask(taskId);
            toast.success('Task deleted successfully!');
            fetchTasks();
        } catch (error) {
            toast.error('Failed to delete task');
        }
    };

    const handleStatusChange = async (taskId, newStatus) => {
        try {
            await taskAPI.updateTask(taskId, { status: newStatus });
            toast.success('Task status updated!');
            fetchTasks();
        } catch (error) {
            toast.error('Failed to update task status');
        }
    };

    const isOverdue = (dueDate, status) => {
        if (!dueDate || status === 'completed') return false;
        return new Date(dueDate) < new Date();
    };

    const priorityWeight = {
        'urgent': 4,
        'high': 3,
        'medium': 2,
        'low': 1
    };

    const sortTasksByDeadline = (tasksToSort) => {
        return [...tasksToSort].sort((a, b) => {
            // First, sort by deadline (nearest first)
            const dateA = a.dueDate ? new Date(a.dueDate).getTime() : Infinity;
            const dateB = b.dueDate ? new Date(b.dueDate).getTime() : Infinity;

            if (dateA !== dateB) {
                return dateA - dateB; // Ascending (nearest first)
            }

            // If deadlines are the same (or both null), sort by priority (descending)
            const priorityA = priorityWeight[a.priority] || 0;
            const priorityB = priorityWeight[b.priority] || 0;
            return priorityB - priorityA; // Descending (urgent first)
        });
    };

    const filteredTasks = sortByDeadline
        ? sortTasksByDeadline(tasks.filter(task =>
            task.title?.toLowerCase().includes(searchTerm.toLowerCase()) &&
            task.status !== 'completed'
        ))
        : tasks.filter(task =>
            task.title?.toLowerCase().includes(searchTerm.toLowerCase())
        );

    const overdueTasks = filteredTasks.filter(t => isOverdue(t.dueDate, t.status));
    const todoTasks = filteredTasks.filter(t => t.status === 'todo' && !isOverdue(t.dueDate, t.status));
    const inProgressTasks = filteredTasks.filter(t => t.status === 'in-progress' && !isOverdue(t.dueDate, t.status));
    const reviewTasks = filteredTasks.filter(t => t.status === 'review' && !isOverdue(t.dueDate, t.status));
    const completedTasks = filteredTasks.filter(t => t.status === 'completed');

    const kanbanColumns = [
        { id: 'overdue', title: 'Overdue', tasks: overdueTasks, color: 'from-red-500 to-pink-500', icon: AlertCircle },
        { id: 'todo', title: 'To Do', tasks: todoTasks, color: 'from-gray-500 to-gray-600', icon: Clock },
        { id: 'in-progress', title: 'In Progress', tasks: inProgressTasks, color: 'from-blue-500 to-cyan-500', icon: Clock },
        { id: 'review', title: 'Review', tasks: reviewTasks, color: 'from-yellow-500 to-orange-500', icon: Tag },
        { id: 'completed', title: 'Completed', tasks: completedTasks, color: 'from-green-500 to-emerald-500', icon: CheckCircle2 },
    ].filter(col => col.id !== 'overdue' || col.tasks.length > 0);

    const TaskCard = ({ task }) => {
        const canEdit = user?.role === 'admin' || task.createdBy?._id === user?._id || task.assignedTo?._id === user?._id;
        const canDelete = (user?.role === 'admin' || task.createdBy?._id === user?._id) && task.status === 'completed';
        const overdueFlag = isOverdue(task.dueDate, task.status);

        return (
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                whileHover={{ scale: 1.02 }}
                transition={{ duration: 0.2 }}
            >
                <Card className={`group relative overflow-hidden ${overdueFlag ? 'border-2 border-red-500' : ''}`}>
                    <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-primary-400/10 to-purple-400/10 rounded-bl-full" />

                    <div className="relative p-5">
                        <div className="flex items-start justify-between mb-3">
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex-1 pr-2 leading-tight">
                                {task.title}
                            </h3>
                            {canEdit && (
                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all duration-200">
                                    <button
                                        onClick={() => handleEditTask(task)}
                                        className="p-2 rounded-lg bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400 hover:bg-primary-100 dark:hover:bg-primary-900/40 transition-colors"
                                        title="Edit task"
                                    >
                                        <Edit className="w-4 h-4" />
                                    </button>
                                    {canDelete && (
                                        <button
                                            onClick={() => handleDeleteTask(task._id)}
                                            className="p-2 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors"
                                            title="Delete task"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>

                        {task.description && (
                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 line-clamp-2">
                                {task.description}
                            </p>
                        )}

                        <div className="flex items-center gap-2 mb-4">
                            <PriorityBadge priority={task.priority} />
                            <StatusBadge status={task.status} />
                        </div>

                        <div className="space-y-2">
                            {task.assignedTo && (
                                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                                    <div className="w-6 h-6 rounded-full bg-gradient-to-br from-primary-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold">
                                        {task.assignedTo.name?.charAt(0).toUpperCase()}
                                    </div>
                                    <span className="font-medium">{task.assignedTo.name}</span>
                                </div>
                            )}

                            {task.dueDate && (
                                <div className={`flex items-center gap-2 text-sm font-medium ${overdueFlag
                                    ? 'text-red-600 dark:text-red-400'
                                    : 'text-gray-600 dark:text-gray-400'
                                    }`}>
                                    <Calendar className="w-4 h-4" />
                                    <span>{formatDate(task.dueDate)}</span>
                                    {overdueFlag && <Badge variant="red" size="sm">Overdue</Badge>}
                                </div>
                            )}
                        </div>

                        {canEdit && task.status !== 'completed' && (
                            <div className="mt-4">
                                <select
                                    value={task.status}
                                    onChange={(e) => handleStatusChange(task._id, e.target.value)}
                                    className="w-full text-sm px-3 py-2.5 rounded-lg border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                                >
                                    <option value="todo">📋 To Do</option>
                                    <option value="in-progress">⚡ In Progress</option>
                                    <option value="review">👁️ Review</option>
                                    <option value="completed">✅ Completed</option>
                                </select>
                            </div>
                        )}
                    </div>
                </Card>
            </motion.div>
        );
    };

    const KanbanColumn = ({ column }) => (
        <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex-1 min-w-[300px]"
        >
            <div className="sticky top-0 z-10 bg-gray-50 dark:bg-gray-900 pb-3">
                <div className={`bg-gradient-to-r ${column.color} p-4 rounded-lg shadow-lg`}>
                    <div className="flex items-center justify-between text-white">
                        <div className="flex items-center gap-2">
                            <column.icon className="w-5 h-5" />
                            <h3 className="font-bold text-lg">{column.title}</h3>
                        </div>
                        <Badge variant="white" size="lg">{column.tasks.length}</Badge>
                    </div>
                </div>
            </div>

            <div className="space-y-3 mt-3 min-h-[200px]">
                <AnimatePresence>
                    {column.tasks.length === 0 ? (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="text-center py-12 text-gray-400 dark:text-gray-600"
                        >
                            <column.icon className="w-12 h-12 mx-auto mb-2 opacity-30" />
                            <p className="text-sm">No tasks</p>
                        </motion.div>
                    ) : (
                        column.tasks.map(task => (
                            <TaskCard key={task._id} task={task} />
                        ))
                    )}
                </AnimatePresence>
            </div>
        </motion.div>
    );

    return (
        <div className="space-y-6">
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
            >
                <div>
                    <h1 className="text-4xl font-bold bg-gradient-to-r from-primary-600 to-purple-600 bg-clip-text text-transparent">
                        Tasks
                    </h1>
                    <p className="text-gray-600 dark:text-gray-400 mt-2">
                        Manage and track your tasks efficiently
                    </p>
                </div>
                <Button onClick={() => {
                    setEditingTask(null);
                    setFormData({ title: '', description: '', priority: 'medium', status: 'todo', dueDate: '', assignedTo: '' });
                    setShowModal(true);
                }} icon={<Plus className="w-5 h-5" />} className="shadow-lg">
                    New Task
                </Button>
            </motion.div>

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="grid grid-cols-2 md:grid-cols-5 gap-4"
            >
                {[
                    { label: 'Total', count: filteredTasks.length, color: 'from-blue-500 to-cyan-500', icon: Clock },
                    { label: 'To Do', count: todoTasks.length, color: 'from-gray-500 to-gray-600', icon: Clock },
                    { label: 'In Progress', count: inProgressTasks.length, color: 'from-blue-500 to-cyan-500', icon: Clock },
                    { label: 'Review', count: reviewTasks.length, color: 'from-yellow-500 to-orange-500', icon: Tag },
                    { label: 'Completed', count: completedTasks.length, color: 'from-green-500 to-emerald-500', icon: CheckCircle2 },
                ].map((stat, index) => (
                    <motion.div
                        key={stat.label}
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: index * 0.05 }}
                    >
                        <Card className="overflow-hidden">
                            <div className={`bg-gradient-to-br ${stat.color} p-4 text-white`}>
                                <div className="flex items-center justify-between mb-2">
                                    <stat.icon className="w-5 h-5" />
                                    <span className="text-3xl font-bold">{stat.count}</span>
                                </div>
                                <p className="text-sm font-medium opacity-90">{stat.label}</p>
                            </div>
                        </Card>
                    </motion.div>
                ))}
            </motion.div>

            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
            >
                <Card className="p-4 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900">
                    <div className="flex flex-col lg:flex-row gap-4">
                        <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                                <input
                                    type="text"
                                    placeholder="Search tasks..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2.5 border-2 border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                                />
                            </div>
                            <Select
                                value={filters.status}
                                onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                                options={[
                                    { value: 'todo', label: 'To Do' },
                                    { value: 'in-progress', label: 'In Progress' },
                                    { value: 'review', label: 'Review' },
                                    { value: 'completed', label: 'Completed' },
                                ]}
                                placeholder="Filter by status"
                            />
                            <Select
                                value={filters.priority}
                                onChange={(e) => setFilters({ ...filters, priority: e.target.value })}
                                options={[
                                    { value: 'low', label: 'Low' },
                                    { value: 'medium', label: 'Medium' },
                                    { value: 'high', label: 'High' },
                                    { value: 'urgent', label: 'Urgent' },
                                ]}
                                placeholder="Filter by priority"
                            />
                            {user?.role === 'admin' && (
                                <Select
                                    value={filters.assignedTo}
                                    onChange={(e) => setFilters({ ...filters, assignedTo: e.target.value })}
                                    options={users.map(u => ({ value: u._id, label: u.name }))}
                                    placeholder="Filter by user"
                                />
                            )}
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setSortByDeadline(!sortByDeadline)}
                                className={`px-4 py-2.5 rounded-lg transition-all flex items-center gap-2 ${sortByDeadline
                                    ? 'bg-primary-600 text-white shadow-lg'
                                    : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                                    }`}
                                title="Sort by nearest deadline and priority"
                            >
                                <Calendar className="w-5 h-5" />
                                <span className="text-sm font-medium hidden sm:inline">Sort by Deadline</span>
                                <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${sortByDeadline
                                    ? 'border-white bg-white/20'
                                    : 'border-gray-300 dark:border-gray-600'
                                    }`}>
                                    {sortByDeadline && (
                                        <svg className="w-3 h-3 text-white" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" viewBox="0 0 24 24" stroke="currentColor">
                                            <path d="M5 13l4 4L19 7"></path>
                                        </svg>
                                    )}
                                </div>
                            </button>
                            <button
                                onClick={() => setViewMode('grid')}
                                className={`p-3 rounded-lg transition-all ${viewMode === 'grid'
                                    ? 'bg-primary-600 text-white shadow-lg'
                                    : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                                    }`}
                                title="Grid view"
                            >
                                <Grid className="w-5 h-5" />
                            </button>
                            <button
                                onClick={() => setViewMode('kanban')}
                                className={`p-3 rounded-lg transition-all ${viewMode === 'kanban'
                                    ? 'bg-primary-600 text-white shadow-lg'
                                    : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                                    }`}
                                title="Kanban view"
                            >
                                <List className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                </Card>
            </motion.div>

            {loading ? (
                <div className="flex flex-col items-center justify-center py-16">
                    <div className="animate-spin rounded-full h-16 w-16 border-4 border-primary-200 border-t-primary-600 mb-4"></div>
                    <p className="text-gray-500 dark:text-gray-400">Loading tasks...</p>
                </div>
            ) : viewMode === 'kanban' ? (
                <div className="flex gap-4 overflow-x-auto pb-4 custom-scrollbar">
                    {kanbanColumns.map(column => (
                        <KanbanColumn key={column.id} column={column} />
                    ))}
                </div>
            ) : (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5"
                >
                    <AnimatePresence>
                        {filteredTasks.length === 0 ? (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="col-span-full text-center py-16"
                            >
                                <CheckCircle2 className="w-16 h-16 text-gray-300 dark:text-gray-700 mx-auto mb-4" />
                                <p className="text-xl font-medium text-gray-500 dark:text-gray-400">No tasks found</p>
                                <p className="text-sm text-gray-400 dark:text-gray-500 mt-2">Create a new task to get started</p>
                            </motion.div>
                        ) : (
                            filteredTasks.map(task => (
                                <TaskCard key={task._id} task={task} />
                            ))
                        )}
                    </AnimatePresence>
                </motion.div>
            )}

            <Modal
                isOpen={showModal}
                onClose={() => {
                    setShowModal(false);
                    setEditingTask(null);
                    setErrors({});
                    setFormData({ title: '', description: '', priority: 'medium', status: 'todo', dueDate: '', assignedTo: '' });
                }}
                title={editingTask ? '✏️ Edit Task' : '✨ Create New Task'}
                footer={
                    <>
                        <Button variant="secondary" onClick={() => {
                            setShowModal(false);
                            setEditingTask(null);
                            setErrors({});
                            setFormData({ title: '', description: '', priority: 'medium', status: 'todo', dueDate: '', assignedTo: '' });
                        }}>
                            Cancel
                        </Button>
                        <Button type="submit" form="task-form">
                            {editingTask ? 'Update Task' : 'Create Task'}
                        </Button>
                    </>
                }
            >
                <form id="task-form" onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <Input
                            label="Task Title"
                            value={formData.title}
                            onChange={(e) => {
                                setFormData({ ...formData, title: e.target.value });
                                if (errors.title) setErrors({ ...errors, title: '' });
                            }}
                            placeholder="Enter task title..."
                        />
                        {errors.title && (
                            <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.title}</p>
                        )}
                    </div>
                    <Textarea
                        label="Description (optional)"
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        rows={3}
                        placeholder="Add task description..."
                    />
                    {user?.role === 'admin' && (
                        <Select
                            label="Assign To (optional)"
                            value={formData.assignedTo}
                            onChange={(e) => setFormData({ ...formData, assignedTo: e.target.value })}
                            options={users.map(u => ({ value: u._id, label: u.name }))}
                            placeholder="Select user"
                        />
                    )}
                    <div className="grid grid-cols-2 gap-4">
                        <Select
                            label="Priority"
                            value={formData.priority}
                            onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                            options={[
                                { value: 'low', label: 'Low' },
                                { value: 'medium', label: 'Medium' },
                                { value: 'high', label: 'High' },
                                { value: 'urgent', label: 'Urgent' },
                            ]}
                        />
                        <Select
                            label="Status"
                            value={formData.status}
                            onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                            options={[
                                { value: 'todo', label: 'To Do' },
                                { value: 'in-progress', label: 'In Progress' },
                                { value: 'review', label: 'Review' },
                                { value: 'completed', label: 'Completed' },
                            ]}
                        />
                    </div>
                    <div>
                        <Input
                            label="Due Date (optional)"
                            type="date"
                            value={formData.dueDate}
                            onChange={(e) => {
                                setFormData({ ...formData, dueDate: e.target.value });
                                if (errors.dueDate) setErrors({ ...errors, dueDate: '' });
                            }}
                        />
                        {errors.dueDate && (
                            <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.dueDate}</p>
                        )}
                    </div>
                </form>
            </Modal>
        </div>
    );
};

export default Tasks;
