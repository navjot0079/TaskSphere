import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { CheckSquare, Clock, AlertCircle, Calendar, FolderKanban, TrendingUp, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { dashboardAPI, taskAPI, projectAPI } from '../services/api';
import Card, { CardHeader, CardBody } from '../components/ui/Card';
import { PriorityBadge, StatusBadge } from '../components/ui/Badge';
import Button from '../components/ui/Button';
import { formatDate, getDaysUntilDue } from '../utils/helpers';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';

const UserDashboard = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [myTasks, setMyTasks] = useState([]);
    const [myProjects, setMyProjects] = useState([]);
    const [stats, setStats] = useState({
        total: 0,
        completed: 0,
        inProgress: 0,
        todo: 0,
        overdue: 0,
    });
    const [chartData, setChartData] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchUserData();
    }, []);

    const fetchUserData = async () => {
        try {
            if (!user?._id) {
                setLoading(false);
                return;
            }

            // Fetch tasks assigned to current user
            const tasksRes = await taskAPI.getTasks({ assignedTo: user._id });
            const tasks = tasksRes.data.tasks || [];

            // Fetch projects where user is a member
            const projectsRes = await projectAPI.getProjects();
            const allProjects = projectsRes.data.projects || [];
            const userProjects = allProjects.filter(p =>
                p.owner?._id === user._id || p.members?.some(m => m.user?._id === user._id)
            );

            setMyTasks(tasks);
            setMyProjects(userProjects);

            // Calculate stats
            const now = new Date();
            const overdueCount = tasks.filter(t =>
                t.dueDate && new Date(t.dueDate) < now && t.status !== 'completed'
            ).length;

            const statusCounts = {
                total: tasks.length,
                completed: tasks.filter(t => t.status === 'completed').length,
                inProgress: tasks.filter(t => t.status === 'in-progress').length,
                todo: tasks.filter(t => t.status === 'todo').length,
                overdue: overdueCount,
            };

            setStats(statusCounts);

            // Chart data - only show non-zero values
            const chartDataArray = [
                { name: 'To Do', value: statusCounts.todo, color: '#6B7280' },
                { name: 'In Progress', value: statusCounts.inProgress, color: '#3B82F6' },
                { name: 'Completed', value: statusCounts.completed, color: '#10B981' },
            ].filter(item => item.value > 0);

            setChartData(chartDataArray.length > 0 ? chartDataArray : [{ name: 'No tasks', value: 1, color: '#9CA3AF' }]);
        } catch (error) {
            console.error('Error fetching user data:', error);
            setStats({ total: 0, completed: 0, inProgress: 0, todo: 0, overdue: 0 });
            setChartData([{ name: 'No tasks', value: 1, color: '#9CA3AF' }]);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
            </div>
        );
    }

    const statCards = [
        { label: 'My Tasks', value: stats.total, icon: CheckSquare, color: 'blue' },
        { label: 'Completed', value: stats.completed, icon: TrendingUp, color: 'green' },
        { label: 'In Progress', value: stats.inProgress, icon: Clock, color: 'yellow' },
        { label: 'Overdue', value: stats.overdue, icon: AlertCircle, color: 'red' },
    ];

    const upcomingTasks = myTasks
        .filter(t => t.dueDate && t.status !== 'completed')
        .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))
        .slice(0, 5);

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                        Welcome back, {user?.name}!
                    </h1>
                    <p className="text-gray-600 dark:text-gray-400 mt-1">
                        Here's your personal task overview
                    </p>
                </div>
                {/* <Button icon={<Plus className="w-5 h-5" />} onClick={() => navigate('/tasks')}>
                    View All Tasks
                </Button> */}
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {statCards.map((stat, index) => {
                    const Icon = stat.icon;
                    return (
                        <motion.div
                            key={stat.label}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.1 }}
                        >
                            <Card hover>
                                <CardBody>
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-sm text-gray-600 dark:text-gray-400">{stat.label}</p>
                                            <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">
                                                {stat.value}
                                            </p>
                                        </div>
                                        <div className={`p-3 bg-${stat.color}-100 dark:bg-${stat.color}-900 rounded-lg`}>
                                            <Icon className={`w-6 h-6 text-${stat.color}-600 dark:text-${stat.color}-400`} />
                                        </div>
                                    </div>
                                </CardBody>
                            </Card>
                        </motion.div>
                    );
                })}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Task Progress Chart */}
                <Card>
                    <CardHeader>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                            Task Progress
                        </h3>
                    </CardHeader>
                    <CardBody>
                        {chartData.length > 0 ? (
                            <ResponsiveContainer width="100%" height={250}>
                                <PieChart>
                                    <Pie
                                        data={chartData}
                                        cx="50%"
                                        cy="50%"
                                        labelLine={false}
                                        label={({ name, value }) => `${name}: ${value}`}
                                        outerRadius={70}
                                        fill="#8884d8"
                                        dataKey="value"
                                    >
                                        {chartData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.color} />
                                        ))}
                                    </Pie>
                                    <Tooltip />
                                </PieChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="h-[250px] flex items-center justify-center text-gray-500 dark:text-gray-400">
                                No tasks yet
                            </div>
                        )}
                    </CardBody>
                </Card>

                {/* Upcoming Deadlines */}
                <Card className="lg:col-span-2">
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                                <Calendar className="w-5 h-5" />
                                Upcoming Deadlines
                            </h3>
                            <Button variant="secondary" size="sm" onClick={() => navigate('/tasks')}>
                                View All
                            </Button>
                        </div>
                    </CardHeader>
                    <CardBody>
                        <div className="space-y-3">
                            {upcomingTasks.length === 0 ? (
                                <p className="text-center text-gray-500 dark:text-gray-400 py-8">
                                    No upcoming deadlines
                                </p>
                            ) : (
                                upcomingTasks.map((task) => {
                                    const daysLeft = getDaysUntilDue(task.dueDate);
                                    const isUrgent = daysLeft !== null && daysLeft <= 2;

                                    return (
                                        <div
                                            key={task._id}
                                            onClick={() => navigate(`/tasks/${task._id}`)}
                                            className={`p-4 border rounded-lg cursor-pointer transition-colors ${isUrgent
                                                ? 'border-red-300 dark:border-red-800 bg-red-50 dark:bg-red-900/20'
                                                : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'
                                                }`}
                                        >
                                            <div className="flex items-start justify-between">
                                                <div className="flex-1">
                                                    <h4 className="font-medium text-gray-900 dark:text-white">
                                                        {task.title}
                                                    </h4>
                                                    <div className="flex items-center gap-3 mt-2">
                                                        <span className="text-sm text-gray-600 dark:text-gray-400">
                                                            Due: {formatDate(task.dueDate)}
                                                        </span>
                                                        {daysLeft !== null && (
                                                            <span className={`text-xs font-medium px-2 py-1 rounded ${isUrgent
                                                                ? 'bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300'
                                                                : 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300'
                                                                }`}>
                                                                {daysLeft === 0 ? 'Today' : `${daysLeft} day${daysLeft !== 1 ? 's' : ''} left`}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <PriorityBadge priority={task.priority} />
                                                    <StatusBadge status={task.status} />
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </CardBody>
                </Card>
            </div>

            {/* My Projects */}
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                            <FolderKanban className="w-5 h-5" />
                            My Projects ({myProjects.length})
                        </h3>
                        <Button variant="secondary" size="sm" onClick={() => navigate('/projects')}>
                            View All
                        </Button>
                    </div>
                </CardHeader>
                <CardBody>
                    {myProjects.length === 0 ? (
                        <p className="text-center text-gray-500 dark:text-gray-400 py-8">
                            No projects assigned
                        </p>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {myProjects.map((project) => (
                                <div
                                    key={project._id}
                                    onClick={() => navigate(`/projects/${project._id}`)}
                                    className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer"
                                >
                                    <h4 className="font-semibold text-gray-900 dark:text-white mb-2">
                                        {project.name}
                                    </h4>
                                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-3 line-clamp-2">
                                        {project.description}
                                    </p>
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs text-gray-500 dark:text-gray-400">
                                            {project.members?.length || 0} members
                                        </span>
                                        <div className="w-full max-w-[100px] bg-gray-200 dark:bg-gray-700 rounded-full h-2 ml-3">
                                            <div
                                                className="bg-primary-600 h-2 rounded-full"
                                                style={{ width: `${project.completionPercentage || 0}%` }}
                                            ></div>
                                        </div>
                                        <span className="text-xs text-gray-600 dark:text-gray-400 ml-2">
                                            {project.completionPercentage || 0}%
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardBody>
            </Card>
        </div>
    );
};

export default UserDashboard;
