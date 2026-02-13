import { Link } from 'react-router-dom';
import { Home } from 'lucide-react';
import Button from '../components/ui/Button';

const NotFound = () => {
    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
            <div className="text-center">
                <h1 className="text-9xl font-bold text-primary-600">404</h1>
                <p className="text-2xl font-semibold text-gray-900 dark:text-white mt-4">
                    Page Not Found
                </p>
                <p className="text-gray-600 dark:text-gray-400 mt-2 mb-8">
                    The page you're looking for doesn't exist or has been moved.
                </p>
                <Link to="/dashboard">
                    <Button icon={<Home className="w-5 h-5" />}>
                        Back to Dashboard
                    </Button>
                </Link>
            </div>
        </div>
    );
};

export default NotFound;
