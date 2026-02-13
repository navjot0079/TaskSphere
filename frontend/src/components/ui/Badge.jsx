const Badge = ({ children, variant = 'primary', size = 'md', className = '' }) => {
    const variantClasses = {
        primary: 'bg-primary-100 text-primary-800 dark:bg-primary-900 dark:text-primary-200',
        success: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
        warning: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
        danger: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
        red: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
        info: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
        gray: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300',
        white: 'bg-white/30 text-white backdrop-blur-sm font-bold',
        secondary: 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
    };

    const sizeClasses = {
        sm: 'px-2 py-0.5 text-xs',
        md: 'px-2.5 py-0.5 text-xs',
        lg: 'px-3 py-1 text-sm',
    };

    return (
        <span
            className={`inline-flex items-center rounded-full font-medium ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
        >
            {children}
        </span>
    );
};

export default Badge;

// Priority badge helper
export const PriorityBadge = ({ priority }) => {
    const variants = {
        low: 'gray',
        medium: 'info',
        high: 'warning',
        urgent: 'danger',
    };

    return <Badge variant={variants[priority]}>{priority}</Badge>;
};

// Status badge helper
export const StatusBadge = ({ status }) => {
    const variants = {
        todo: 'gray',
        'in-progress': 'info',
        review: 'warning',
        completed: 'success',
        cancelled: 'danger',
    };

    const labels = {
        todo: 'To Do',
        'in-progress': 'In Progress',
        review: 'In Review',
        completed: 'Completed',
        cancelled: 'Cancelled',
    };

    return <Badge variant={variants[status]}>{labels[status]}</Badge>;
};
