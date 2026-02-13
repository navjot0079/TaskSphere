export const formatDate = (date) => {
    if (!date) return '';
    return new Date(date).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
    });
};

export const formatDateTime = (date) => {
    if (!date) return '';
    return new Date(date).toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
};

export const formatRelativeTime = (date) => {
    if (!date) return '';

    const now = new Date();
    const past = new Date(date);
    const diffMs = now - past;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return formatDate(date);
};

export const isOverdue = (dueDate, status) => {
    if (!dueDate || status === 'completed') return false;
    return new Date(dueDate) < new Date();
};

export const getDaysUntilDue = (dueDate) => {
    if (!dueDate) return null;
    const now = new Date();
    const due = new Date(dueDate);
    const diffMs = due - now;
    const diffDays = Math.ceil(diffMs / 86400000);
    return diffDays;
};

export const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
};

export const truncate = (str, length = 50) => {
    if (!str) return '';
    if (str.length <= length) return str;
    return str.substring(0, length) + '...';
};

export const getInitials = (name) => {
    if (!name) return '';
    return name
        .split(' ')
        .map(n => n[0])
        .join('')
        .toUpperCase()
        .substring(0, 2);
};

export const capitalizeFirst = (str) => {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1);
};

export const getPriorityColor = (priority) => {
    const colors = {
        low: 'text-gray-600 bg-gray-100 dark:bg-gray-800',
        medium: 'text-blue-600 bg-blue-100 dark:bg-blue-900',
        high: 'text-orange-600 bg-orange-100 dark:bg-orange-900',
        urgent: 'text-red-600 bg-red-100 dark:bg-red-900',
    };
    return colors[priority] || colors.medium;
};

export const getStatusColor = (status) => {
    const colors = {
        todo: 'text-gray-600 bg-gray-100 dark:bg-gray-800',
        'in-progress': 'text-blue-600 bg-blue-100 dark:bg-blue-900',
        review: 'text-purple-600 bg-purple-100 dark:bg-purple-900',
        completed: 'text-green-600 bg-green-100 dark:bg-green-900',
        cancelled: 'text-red-600 bg-red-100 dark:bg-red-900',
    };
    return colors[status] || colors.todo;
};

export const downloadFile = (blob, filename) => {
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
};

export const formatDuration = (hours) => {
    if (!hours || hours === 0) return '0h';

    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);

    if (h === 0) return `${m}m`;
    if (m === 0) return `${h}h`;
    return `${h}h ${m}m`;
};
