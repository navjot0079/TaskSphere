import { useState, useEffect } from 'react';
import { Users, History, Clock, User, CheckCircle } from 'lucide-react';
import { taskAPI, userAPI } from '../services/api';
import Card, { CardHeader, CardBody } from '../components/ui/Card';
import Badge, { PriorityBadge, StatusBadge } from '../components/ui/Badge';
import { formatDate } from '../utils/helpers';
import toast from 'react-hot-toast';

const AdminTasks = () => {
    const [activeTab, setActiveTab] = useState('users'); // users, history
    const [tasks, setTasks] = useState([]);
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);

    // Users tab state
    const [selectedUser, setSelectedUser] = useState('');
    const [userStats, setUserStats] = useState({});

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [tasksRes, usersRes] = await Promise.all([
                taskAPI.getTasks({}),
                userAPI.getAllUsers(),
            ]);
            setTasks(tasksRes.data.tasks);
            setUsers(usersRes.data.users || []);
            calculateUserStats(tasksRes.data.tasks, usersRes.data.users || []);
        } catch (error) {
            toast.error('Failed to load data');
        } finally {
            setLoading(false);
        }
    };

    const calculateUserStats = (allTasks, allUsers) => {
        const stats = {};
        allUsers.forEach(user => {
            const userTasks = allTasks.filter(t => t.assignedTo?._id === user._id);
            stats[user._id] = {
                todo: userTasks.filter(t => t.status === 'todo').length,
                inProgress: userTasks.filter(t => t.status === 'in-progress').length,
                review: userTasks.filter(t => t.status === 'review').length,
                completed: userTasks.filter(t => t.status === 'completed').length,
                total: userTasks.length,
            };
        });
        setUserStats(stats);
    };

    const completedTasks = tasks.filter(t => t.status === 'completed');

    // Tab buttons
    const TabButton = ({ icon: Icon, label, tab }) => (
        <button
            onClick={() => setActiveTab(tab)}
            className={`flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-all ${activeTab === tab
                ? 'bg-primary-600 text-white shadow-lg'
                : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
        >
            <Icon className="w-5 h-5" />
            {label}
        </button>
    );

    // Users Tab Content
    const UsersTab = () => (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        User Task Statistics
                    </h3>
                </CardHeader>
                <CardBody>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50 dark:bg-gray-800">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                                        User
                                    </th>
                                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                                        To Do
                                    </th>
                                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                                        In Progress
                                    </th>
                                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                                        Review
                                    </th>
                                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                                        Completed
                                    </th>
                                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                                        Total
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                                {users.map(user => {
                                    const stats = userStats[user._id] || { todo: 0, inProgress: 0, review: 0, completed: 0, total: 0 };
                                    return (
                                        <tr key={user._id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center">
                                                    <div className="flex-shrink-0 h-10 w-10 rounded-full bg-gradient-to-br from-primary-500 to-purple-600 flex items-center justify-center text-white font-semibold">
                                                        {user.name.charAt(0).toUpperCase()}
                                                    </div>
                                                    <div className="ml-4">
                                                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                                                            {user.name}
                                                        </div>
                                                        <div className="text-sm text-gray-500 dark:text-gray-400">
                                                            {user.email}
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <Badge variant="gray" size="sm">{stats.todo}</Badge>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <Badge variant="blue" size="sm">{stats.inProgress}</Badge>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <Badge variant="yellow" size="sm">{stats.review}</Badge>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <Badge variant="green" size="sm">{stats.completed}</Badge>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <span className="text-sm font-semibold text-gray-900 dark:text-white">
                                                    {stats.total}
                                                </span>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </CardBody>
            </Card>
        </div>
    );

    // History Tab Content
    const HistoryTab = () => (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                            Completed Tasks History
                        </h3>
                        <Badge variant="green" size="lg">
                            {completedTasks.length} completed
                        </Badge>
                    </div>
                </CardHeader>
                <CardBody>
                    <div className="space-y-3">
                        {completedTasks.length === 0 ? (
                            <div className="text-center py-12">
                                <CheckCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                                <p className="text-gray-500 dark:text-gray-400">No completed tasks yet</p>
                            </div>
                        ) : (
                            completedTasks.map(task => (
                                <Card key={task._id} className="border-l-4 border-green-500">
                                    <div className="p-4">
                                        <div className="flex items-start justify-between mb-3">
                                            <div className="flex-1">
                                                <h4 className="font-semibold text-gray-900 dark:text-white mb-1">
                                                    {task.title}
                                                </h4>
                                                {task.description && (
                                                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-2 line-clamp-2">
                                                        {task.description}
                                                    </p>
                                                )}
                                            </div>
                                            <PriorityBadge priority={task.priority} />
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                                            <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                                                <User className="w-4 h-4" />
                                                <div>
                                                    <span className="text-xs text-gray-500">Assigned to:</span>
                                                    <p className="font-medium text-gray-900 dark:text-white">
                                                        {task.assignedTo?.name || 'Unassigned'}
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                                                <User className="w-4 h-4" />
                                                <div>
                                                    <span className="text-xs text-gray-500">Created by:</span>
                                                    <p className="font-medium text-gray-900 dark:text-white">
                                                        {task.createdBy?.name || 'Unknown'}
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                                                <Clock className="w-4 h-4" />
                                                <div>
                                                    <span className="text-xs text-gray-500">Completed on:</span>
                                                    <p className="font-medium text-gray-900 dark:text-white">
                                                        {task.completedDate ? formatDate(task.completedDate) : formatDate(task.updatedAt)}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>

                                        {task.dueDate && (
                                            <div className="mt-3 text-xs text-gray-500 dark:text-gray-500">
                                                Due date was: {formatDate(task.dueDate)}
                                            </div>
                                        )}

                                        {task.project && (
                                            <div className="mt-2">
                                                <Badge variant="purple" size="sm">
                                                    {task.project.name}
                                                </Badge>
                                            </div>
                                        )}
                                    </div>
                                </Card>
                            ))
                        )}
                    </div>
                </CardBody>
            </Card>
        </div>
    );

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Admin Task Management</h1>
                <p className="text-gray-600 dark:text-gray-400 mt-1">
                    Comprehensive task overview and user statistics
                </p>
            </div>

            {/* Tab Navigation */}
            <div className="flex flex-wrap gap-3">
                <TabButton icon={Users} label="Users Overview" tab="users" />
                <TabButton icon={History} label="Completion History" tab="history" />
            </div>

            {/* Loading State */}
            {loading ? (
                <div className="flex justify-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
                </div>
            ) : (
                <>
                    {activeTab === 'users' && <UsersTab />}
                    {activeTab === 'history' && <HistoryTab />}
                </>
            )}
        </div>
    );
};

export default AdminTasks;
