import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Users, FolderKanban, CheckSquare, AlertTriangle, TrendingUp, UserCheck, Plus, Bell } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { dashboardAPI, userAPI, projectAPI, taskAPI, notificationAPI } from '../services/api';
import Card, { CardHeader, CardBody } from '../components/ui/Card';
import { PriorityBadge, StatusBadge } from '../components/ui/Badge';
import Button from '../components/ui/Button';
import { formatDate, formatRelativeTime } from '../utils/helpers';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const AdminDashboard = () => {
    const navigate = useNavigate();
    const [stats, setStats] = useState({
        totalUsers: 0,
        totalProjects: 0,
        totalTasks: 0,
        pendingTasks: 0,
        completedTasks: 0,
        activeUsers: 0,
    });
    const [recentActivity, setRecentActivity] = useState([]);
    const [chartData, setChartData] = useState([]);
    const [projectStats, setProjectStats] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchAdminData();
    }, []);

    const fetchAdminData = async () => {
        try {
            const [usersRes, projectsRes, tasksRes, chartsRes, activityRes] = await Promise.all([
                userAPI.getAllUsers(),
                projectAPI.getProjects(),
                taskAPI.getTasks(),
                dashboardAPI.getCharts({ type: 'status-distribution' }),
                notificationAPI.getNotifications({ limit: 10 }),
            ]);

            const users = usersRes.data.users || [];
            const projects = projectsRes.data.projects || [];
            const tasks = tasksRes.data.tasks || [];

            setStats({
                totalUsers: users.length,
                totalProjects: projects.length,
                totalTasks: tasks.length,
                pendingTasks: tasks.filter(t => t.status !== 'completed').length,
                completedTasks: tasks.filter(t => t.status === 'completed').length,
                activeUsers: users.filter(u => u.isVerified).length,
            });

            setChartData(chartsRes.data.data || []);
            setRecentActivity(activityRes.data.notifications || []);

            // Project statistics
            const projectStatsData = projects.slice(0, 5).map(p => ({
                name: p.name?.substring(0, 15) || 'Unnamed',
                tasks: tasks.filter(t => t.project?._id === p._id).length,
                completed: tasks.filter(t => t.project?._id === p._id && t.status === 'completed').length,
            }));
            setProjectStats(projectStatsData);
        } catch (error) {
            console.error('Error fetching admin data:', error);
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
        { label: 'Total Users', value: stats.totalUsers, icon: Users, color: 'blue', link: '/admin' },
        { label: 'Total Projects', value: stats.totalProjects, icon: FolderKanban, color: 'purple', link: '/projects' },
        { label: 'Total Tasks', value: stats.totalTasks, icon: CheckSquare, color: 'green', link: '/tasks' },
        { label: 'Pending Tasks', value: stats.pendingTasks, icon: AlertTriangle, color: 'yellow', link: '/tasks' },
        { label: 'Completed', value: stats.completedTasks, icon: TrendingUp, color: 'emerald', link: '/tasks' },
        { label: 'Active Users', value: stats.activeUsers, icon: UserCheck, color: 'indigo', link: '/admin' },
    ];

    const COLORS = ['#9CA3AF', '#3B82F6', '#A855F7', '#10B981', '#EF4444'];

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Admin Dashboard</h1>
                    <p className="text-gray-600 dark:text-gray-400 mt-1">
                        Manage users, projects, and tasks
                    </p>
                </div>
                <div className="flex gap-3">
                    <Button variant="secondary" onClick={() => navigate('/admin')}>
                        Manage Users
                    </Button>
                    <Button icon={<Plus className="w-5 h-5" />} onClick={() => navigate('/tasks')}>
                        Create Task
                    </Button>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {statCards.map((stat, index) => {
                    const Icon = stat.icon;
                    return (
                        <motion.div
                            key={stat.label}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.1 }}
                            onClick={() => navigate(stat.link)}
                            className="cursor-pointer"
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
                {/* Task Status Distribution */}
                <Card className="lg:col-span-1">
                    <CardHeader>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                            Task Status
                        </h3>
                    </CardHeader>
                    <CardBody>
                        <ResponsiveContainer width="100%" height={250}>
                            <PieChart>
                                <Pie
                                    data={chartData}
                                    cx="50%"
                                    cy="50%"
                                    labelLine={false}
                                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                                    outerRadius={70}
                                    fill="#8884d8"
                                    dataKey="value"
                                >
                                    {chartData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip />
                            </PieChart>
                        </ResponsiveContainer>
                    </CardBody>
                </Card>

                {/* Project Progress */}
                <Card className="lg:col-span-2">
                    <CardHeader>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                            Top Projects Progress
                        </h3>
                    </CardHeader>
                    <CardBody>
                        <ResponsiveContainer width="100%" height={250}>
                            <BarChart data={projectStats}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="name" />
                                <YAxis />
                                <Tooltip />
                                <Bar dataKey="tasks" fill="#3B82F6" name="Total Tasks" />
                                <Bar dataKey="completed" fill="#10B981" name="Completed" />
                            </BarChart>
                        </ResponsiveContainer>
                    </CardBody>
                </Card>
            </div>

            {/* Recent Activity */}
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                            <Bell className="w-5 h-5" />
                            Recent Activity
                        </h3>
                        <Button variant="secondary" size="sm" onClick={() => navigate('/notifications')}>
                            View All
                        </Button>
                    </div>
                </CardHeader>
                <CardBody>
                    <div className="space-y-3 max-h-[400px] overflow-y-auto custom-scrollbar">
                        {recentActivity.length === 0 ? (
                            <p className="text-center text-gray-500 dark:text-gray-400 py-8">
                                No recent activity
                            </p>
                        ) : (
                            recentActivity.map((activity) => (
                                <div
                                    key={activity._id}
                                    className="flex items-start gap-3 p-3 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800"
                                >
                                    <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary-100 dark:bg-primary-900 flex items-center justify-center">
                                        <Bell className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                                            {activity.title}
                                        </p>
                                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                            {activity.message}
                                        </p>
                                        <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                                            {formatRelativeTime(activity.createdAt)}
                                        </p>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </CardBody>
            </Card>

            {/* Quick Actions */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card hover className="cursor-pointer" onClick={() => navigate('/projects')}>
                    <CardBody>
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-purple-100 dark:bg-purple-900 rounded-lg">
                                <FolderKanban className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                            </div>
                            <div>
                                <h4 className="font-semibold text-gray-900 dark:text-white">Manage Projects</h4>
                                <p className="text-sm text-gray-600 dark:text-gray-400">Create and assign projects</p>
                            </div>
                        </div>
                    </CardBody>
                </Card>

                <Card hover className="cursor-pointer" onClick={() => navigate('/tasks')}>
                    <CardBody>
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-green-100 dark:bg-green-900 rounded-lg">
                                <CheckSquare className="w-6 h-6 text-green-600 dark:text-green-400" />
                            </div>
                            <div>
                                <h4 className="font-semibold text-gray-900 dark:text-white">Assign Tasks</h4>
                                <p className="text-sm text-gray-600 dark:text-gray-400">Create and assign tasks</p>
                            </div>
                        </div>
                    </CardBody>
                </Card>

                <Card hover className="cursor-pointer" onClick={() => navigate('/admin')}>
                    <CardBody>
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-blue-100 dark:bg-blue-900 rounded-lg">
                                <Users className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                            </div>
                            <div>
                                <h4 className="font-semibold text-gray-900 dark:text-white">Manage Users</h4>
                                <p className="text-sm text-gray-600 dark:text-gray-400">Add and manage team members</p>
                            </div>
                        </div>
                    </CardBody>
                </Card>
            </div>
        </div>
    );
};

export default AdminDashboard;
