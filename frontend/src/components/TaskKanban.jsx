import { motion, AnimatePresence } from 'framer-motion';
import { Clock, Edit, Trash2, User } from 'lucide-react';
import { PriorityBadge, StatusBadge } from './ui/Badge';
import Card from './ui/Card';
import Badge from './ui/Badge';
import { formatDate } from '../utils/helpers';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
const SERVER_URL = API_BASE_URL.replace('/api', '');

const TaskKanban = ({ tasks, onEditTask, onDeleteTask, onUpdateStatus, isAdmin }) => {
    const tasksByStatus = {
        todo: tasks.filter((t) => t.status === 'todo'),
        'in-progress': tasks.filter((t) => t.status === 'in-progress'),
        review: tasks.filter((t) => t.status === 'review'),
        completed: tasks.filter((t) => t.status === 'completed'),
    };

    const statusConfig = {
        todo: {
            title: 'To Do',
            bgColor: 'bg-gray-100 dark:bg-gray-800',
            borderColor: 'border-gray-300 dark:border-gray-600',
            headerColor: 'bg-gray-200 dark:bg-gray-700',
        },
        'in-progress': {
            title: 'In Progress',
            bgColor: 'bg-blue-50 dark:bg-blue-900/20',
            borderColor: 'border-blue-300 dark:border-blue-700',
            headerColor: 'bg-blue-100 dark:bg-blue-900/40',
        },
        review: {
            title: 'Review',
            bgColor: 'bg-yellow-50 dark:bg-yellow-900/20',
            borderColor: 'border-yellow-300 dark:border-yellow-700',
            headerColor: 'bg-yellow-100 dark:bg-yellow-900/40',
        },
        completed: {
            title: 'Completed',
            bgColor: 'bg-green-50 dark:bg-green-900/20',
            borderColor: 'border-green-300 dark:border-green-700',
            headerColor: 'bg-green-100 dark:bg-green-900/40',
        },
    };

    const priorityColors = {
        low: 'gray',
        medium: 'blue',
        high: 'orange',
        urgent: 'red',
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {Object.entries(tasksByStatus).map(([status, statusTasks]) => {
                const config = statusConfig[status];
                return (
                    <div key={status} className="flex flex-col">
                        <div
                            className={`${config.headerColor} ${config.borderColor} border-2 rounded-t-lg p-3`}
                        >
                            <div className="flex items-center justify-between">
                                <h4 className="font-semibold text-gray-900 dark:text-white">
                                    {config.title}
                                </h4>
                                <Badge variant="secondary" size="sm">
                                    {statusTasks.length}
                                </Badge>
                            </div>
                        </div>
                        <div
                            className={`${config.bgColor} ${config.borderColor} border-2 border-t-0 rounded-b-lg p-3 min-h-[500px] space-y-3`}
                        >
                            <AnimatePresence>
                                {statusTasks.length === 0 ? (
                                    <p className="text-center text-gray-500 dark:text-gray-400 py-8 text-sm">
                                        No tasks
                                    </p>
                                ) : (
                                    statusTasks.map((task) => (
                                        <motion.div
                                            key={task._id}
                                            layout
                                            initial={{ opacity: 0, scale: 0.8 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            exit={{ opacity: 0, scale: 0.8 }}
                                            transition={{ duration: 0.2 }}
                                        >
                                            <Card hover className="cursor-pointer">
                                                <div className="p-3">
                                                    <div className="flex items-start justify-between mb-2">
                                                        <h5 className="font-medium text-sm text-gray-900 dark:text-white flex-1 pr-2">
                                                            {task.title}
                                                        </h5>
                                                        {isAdmin && (
                                                            <div className="flex gap-1">
                                                                <button
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        onEditTask(task);
                                                                    }}
                                                                    className="text-gray-600 hover:text-primary-600 dark:text-gray-400 dark:hover:text-primary-400"
                                                                    title="Edit task"
                                                                >
                                                                    <Edit className="w-4 h-4" />
                                                                </button>
                                                                <button
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        onDeleteTask(task._id);
                                                                    }}
                                                                    className="text-gray-600 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400"
                                                                    title="Delete task"
                                                                >
                                                                    <Trash2 className="w-4 h-4" />
                                                                </button>
                                                            </div>
                                                        )}
                                                    </div>

                                                    {task.description && (
                                                        <p className="text-xs text-gray-600 dark:text-gray-400 mb-3 line-clamp-2">
                                                            {task.description}
                                                        </p>
                                                    )}

                                                    <div className="flex items-center justify-between mb-2">
                                                        <Badge variant={priorityColors[task.priority]} size="sm">
                                                            {task.priority}
                                                        </Badge>

                                                        {task.assignedTo && (
                                                            <div className="flex items-center gap-1" title={task.assignedTo.name}>
                                                                {task.assignedTo.avatar ? (
                                                                    <img
                                                                        src={`${SERVER_URL}${task.assignedTo.avatar}`}
                                                                        alt={task.assignedTo.name}
                                                                        className="w-6 h-6 rounded-full border-2 border-white dark:border-gray-800"
                                                                    />
                                                                ) : (
                                                                    <div className="w-6 h-6 rounded-full bg-primary-600 flex items-center justify-center text-white text-xs font-bold">
                                                                        {task.assignedTo.name.charAt(0)}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>

                                                    {task.dueDate && (
                                                        <div className="flex items-center gap-1 text-xs text-gray-600 dark:text-gray-400 mb-2">
                                                            <Clock className="w-3 h-3" />
                                                            <span>{formatDate(task.dueDate)}</span>
                                                        </div>
                                                    )}

                                                    {status !== 'completed' && (
                                                        <select
                                                            value={task.status}
                                                            onChange={(e) => {
                                                                e.stopPropagation();
                                                                onUpdateStatus(task._id, e.target.value);
                                                            }}
                                                            className="w-full text-xs px-2 py-1.5 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                                                            onClick={(e) => e.stopPropagation()}
                                                        >
                                                            <option value="todo">To Do</option>
                                                            <option value="in-progress">In Progress</option>
                                                            <option value="review">Review</option>
                                                            <option value="completed">Completed</option>
                                                        </select>
                                                    )}
                                                </div>
                                            </Card>
                                        </motion.div>
                                    ))
                                )}
                            </AnimatePresence>
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

export default TaskKanban;
