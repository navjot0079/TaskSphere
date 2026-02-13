import { motion } from 'framer-motion';

const Card = ({ children, className = '', hover = false, onClick }) => {
    return (
        <motion.div
            whileHover={hover ? { y: -4, boxShadow: '0 10px 30px rgba(0,0,0,0.1)' } : {}}
            className={`bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 transition-all ${onClick ? 'cursor-pointer' : ''
                } ${className}`}
            onClick={onClick}
        >
            {children}
        </motion.div>
    );
};

export const CardHeader = ({ children, className = '' }) => {
    return (
        <div className={`p-6 border-b border-gray-200 dark:border-gray-700 ${className}`}>
            {children}
        </div>
    );
};

export const CardBody = ({ children, className = '' }) => {
    return <div className={`p-6 ${className}`}>{children}</div>;
};

export const CardFooter = ({ children, className = '' }) => {
    return (
        <div className={`p-6 border-t border-gray-200 dark:border-gray-700 ${className}`}>
            {children}
        </div>
    );
};

export default Card;
