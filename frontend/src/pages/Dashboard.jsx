import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { CheckSquare, Clock, AlertCircle, TrendingUp, Plus } from 'lucide-react';
import { dashboardAPI, taskAPI } from '../services/api';
import Card, { CardHeader, CardBody } from '../components/ui/Card';
import { PriorityBadge, StatusBadge } from '../components/ui/Badge';
import Button from '../components/ui/Button';
import { formatDate, isOverdue } from '../utils/helpers';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const Dashboard = () => {
    const [stats, setStats] = useState(null);
    const [upcomingTasks, setUpcomingTasks] = useState([]);
    const [chartData, setChartData] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchDashboardData();
    }, []);

    const fetchDashboardData = async () => {
        try {
            const [statsRes, upcomingRes, chartRes] = await Promise.all([
                dashboardAPI.getStats(),
                dashboardAPI.getUpcoming({ days: 7 }),
                dashboardAPI.getCharts({ type: 'status-distribution' }),
            ]);

            setStats(statsRes.data.stats);
            setUpcomingTasks(upcomingRes.data.tasks || []);

            // Fix chart data - filter out zero values
            const chartDataFiltered = (chartRes.data.data || []).filter(item => item.value > 0);
            setChartData(chartDataFiltered.length > 0 ? chartDataFiltered : [{ name: 'No tasks', value: 1 }]);
        } catch (error) {
            console.error('Error fetching dashboard data:', error);
            setStats({ total: 0, completed: 0, inProgress: 0, overdue: 0 });
            setUpcomingTasks([]);
            setChartData([{ name: 'No tasks', value: 1 }]);
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
        { label: 'Total Tasks', value: stats?.total || 0, icon: CheckSquare, color: 'blue' },
        { label: 'Completed', value: stats?.completed || 0, icon: CheckSquare, color: 'green' },
        { label: 'In Progress', value: stats?.inProgress || 0, icon: Clock, color: 'yellow' },
        { label: 'Overdue', value: stats?.overdue || 0, icon: AlertCircle, color: 'red' },
    ];

    const COLORS = ['#9CA3AF', '#3B82F6', '#A855F7', '#10B981', '#EF4444'];

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
                    <p className="text-gray-600 dark:text-gray-400 mt-1">
                        Welcome back! Here's your task overview
                    </p>
                </div>
                <Button icon={<Plus className="w-5 h-5" />}>
                    New Task
                </Button>
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

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Status Distribution Chart */}
                <Card>
                    <CardHeader>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                            Task Distribution
                        </h3>
                    </CardHeader>
                    <CardBody>
                        <ResponsiveContainer width="100%" height={300}>
                            <PieChart>
                                <Pie
                                    data={chartData}
                                    cx="50%"
                                    cy="50%"
                                    labelLine={false}
                                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                                    outerRadius={80}
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

                {/* Upcoming Tasks */}
                <Card>
                    <CardHeader>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                            Upcoming Tasks
                        </h3>
                    </CardHeader>
                    <CardBody>
                        <div className="space-y-3 max-h-[300px] overflow-y-auto custom-scrollbar">
                            {upcomingTasks.length === 0 ? (
                                <p className="text-center text-gray-500 dark:text-gray-400 py-8">
                                    No upcoming tasks
                                </p>
                            ) : (
                                upcomingTasks.map((task) => (
                                    <div
                                        key={task._id}
                                        className="p-3 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer"
                                    >
                                        <div className="flex items-start justify-between">
                                            <div className="flex-1">
                                                <h4 className="font-medium text-gray-900 dark:text-white">
                                                    {task.title}
                                                </h4>
                                                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                                    Due: {formatDate(task.dueDate)}
                                                </p>
                                            </div>
                                            <div className="flex items-center space-x-2">
                                                <PriorityBadge priority={task.priority} />
                                                <StatusBadge status={task.status} />
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </CardBody>
                </Card>
            </div>
        </div>
    );
};

export default Dashboard;
