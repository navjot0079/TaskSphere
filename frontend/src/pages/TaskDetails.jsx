import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Clock, User, Calendar, MessageCircle, Paperclip, Play, Pause } from 'lucide-react';
import { taskAPI } from '../services/api';
import { useSocket } from '../context/SocketContext';
import Button from '../components/ui/Button';
import Card, { CardHeader, CardBody } from '../components/ui/Card';
import { PriorityBadge, StatusBadge } from '../components/ui/Badge';
import Input from '../components/ui/Input';
import { formatDate, formatDuration } from '../utils/helpers';
import toast from 'react-hot-toast';

const TaskDetails = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { socket } = useSocket();
    const [task, setTask] = useState(null);
    const [loading, setLoading] = useState(true);
    const [comment, setComment] = useState('');
    const [isTracking, setIsTracking] = useState(false);

    useEffect(() => {
        fetchTask();

        if (socket) {
            socket.emit('task:join', { taskId: id });

            socket.on('task:updated', (updatedTask) => {
                if (updatedTask._id === id) {
                    setTask(updatedTask);
                }
            });

            return () => {
                socket.emit('task:leave', { taskId: id });
                socket.off('task:updated');
            };
        }
    }, [id, socket]);

    const fetchTask = async () => {
        try {
            const { data } = await taskAPI.getTaskById(id);
            setTask(data.task);
            setIsTracking(data.task.isTracking || false);
        } catch (error) {
            toast.error('Failed to load task');
            navigate('/tasks');
        } finally {
            setLoading(false);
        }
    };

    const handleToggleTimeTracking = async () => {
        try {
            if (isTracking) {
                await taskAPI.stopTimeTracking(id);
                toast.success('Time tracking stopped');
                setIsTracking(false);
            } else {
                await taskAPI.startTimeTracking(id);
                toast.success('Time tracking started');
                setIsTracking(true);
            }
            fetchTask();
        } catch (error) {
            toast.error('Failed to toggle time tracking');
        }
    };

    const handleAddComment = async (e) => {
        e.preventDefault();
        if (!comment.trim()) return;

        try {
            await taskAPI.addComment(id, { content: comment });
            setComment('');
            toast.success('Comment added');
            fetchTask();
        } catch (error) {
            toast.error('Failed to add comment');
        }
    };

    const handleToggleSubtask = async (subtaskId) => {
        try {
            await taskAPI.toggleSubtask(id, subtaskId);
            fetchTask();
        } catch (error) {
            toast.error('Failed to update subtask');
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
            </div>
        );
    }

    if (!task) return null;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => navigate('/tasks')}
                        className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
                    >
                        <ArrowLeft className="w-6 h-6" />
                    </button>
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{task.title}</h1>
                        <div className="flex items-center gap-3 mt-2">
                            <PriorityBadge priority={task.priority} />
                            <StatusBadge status={task.status} />
                        </div>
                    </div>
                </div>
                <Button
                    onClick={handleToggleTimeTracking}
                    icon={isTracking ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                    variant={isTracking ? 'danger' : 'primary'}
                >
                    {isTracking ? 'Stop Tracking' : 'Start Tracking'}
                </Button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main Content */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Description */}
                    <Card>
                        <CardHeader>
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                                Description
                            </h3>
                        </CardHeader>
                        <CardBody>
                            <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                                {task.description || 'No description provided'}
                            </p>
                        </CardBody>
                    </Card>

                    {/* Subtasks */}
                    {task.subtasks && task.subtasks.length > 0 && (
                        <Card>
                            <CardHeader>
                                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                                    Subtasks ({task.subtasks.filter((s) => s.isCompleted).length}/
                                    {task.subtasks.length})
                                </h3>
                            </CardHeader>
                            <CardBody>
                                <div className="space-y-2">
                                    {task.subtasks.map((subtask) => (
                                        <label
                                            key={subtask._id}
                                            className="flex items-center gap-3 p-3 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg cursor-pointer"
                                        >
                                            <input
                                                type="checkbox"
                                                checked={subtask.isCompleted}
                                                onChange={() => handleToggleSubtask(subtask._id)}
                                                className="w-5 h-5 text-primary-600 rounded focus:ring-primary-500"
                                            />
                                            <span
                                                className={`flex-1 ${subtask.isCompleted
                                                        ? 'line-through text-gray-500'
                                                        : 'text-gray-900 dark:text-white'
                                                    }`}
                                            >
                                                {subtask.title}
                                            </span>
                                        </label>
                                    ))}
                                </div>
                            </CardBody>
                        </Card>
                    )}

                    {/* Comments */}
                    <Card>
                        <CardHeader>
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                                Comments
                            </h3>
                        </CardHeader>
                        <CardBody>
                            <div className="space-y-4 mb-4">
                                {task.comments?.map((comment) => (
                                    <div key={comment._id} className="flex gap-3">
                                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-primary-500 to-purple-600 flex items-center justify-center text-white text-sm font-semibold">
                                            {comment.user?.name?.charAt(0).toUpperCase()}
                                        </div>
                                        <div className="flex-1">
                                            <div className="flex items-baseline gap-2">
                                                <span className="font-medium text-gray-900 dark:text-white">
                                                    {comment.user?.name}
                                                </span>
                                                <span className="text-xs text-gray-500">
                                                    {formatDate(comment.createdAt)}
                                                </span>
                                            </div>
                                            <p className="text-gray-700 dark:text-gray-300 mt-1">
                                                {comment.content}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <form onSubmit={handleAddComment} className="flex gap-2">
                                <Input
                                    value={comment}
                                    onChange={(e) => setComment(e.target.value)}
                                    placeholder="Add a comment..."
                                    className="flex-1"
                                />
                                <Button type="submit">Post</Button>
                            </form>
                        </CardBody>
                    </Card>
                </div>

                {/* Sidebar */}
                <div className="space-y-6">
                    <Card>
                        <CardHeader>
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Details</h3>
                        </CardHeader>
                        <CardBody>
                            <div className="space-y-4">
                                <div className="flex items-center gap-3 text-sm">
                                    <User className="w-5 h-5 text-gray-400" />
                                    <div>
                                        <p className="text-gray-500 dark:text-gray-400">Assigned to</p>
                                        <p className="text-gray-900 dark:text-white font-medium">
                                            {task.assignedTo?.name || 'Unassigned'}
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-3 text-sm">
                                    <Calendar className="w-5 h-5 text-gray-400" />
                                    <div>
                                        <p className="text-gray-500 dark:text-gray-400">Due date</p>
                                        <p className="text-gray-900 dark:text-white font-medium">
                                            {task.dueDate ? formatDate(task.dueDate) : 'No due date'}
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-3 text-sm">
                                    <Clock className="w-5 h-5 text-gray-400" />
                                    <div>
                                        <p className="text-gray-500 dark:text-gray-400">Time logged</p>
                                        <p className="text-gray-900 dark:text-white font-medium">
                                            {formatDuration(task.loggedHours || 0)}
                                        </p>
                                    </div>
                                </div>

                                {task.project && (
                                    <div className="flex items-center gap-3 text-sm">
                                        <Paperclip className="w-5 h-5 text-gray-400" />
                                        <div>
                                            <p className="text-gray-500 dark:text-gray-400">Project</p>
                                            <p className="text-gray-900 dark:text-white font-medium">
                                                {task.project.name}
                                            </p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </CardBody>
                    </Card>
                </div>
            </div>
        </div>
    );
};

export default TaskDetails;
