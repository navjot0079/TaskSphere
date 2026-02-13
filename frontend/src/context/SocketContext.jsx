import { createContext, useContext, useEffect } from 'react';
import { useAuth } from './AuthContext';
import socketService from '../services/socket';

const SocketContext = createContext();

export const useSocket = () => {
    const context = useContext(SocketContext);
    if (!context) {
        throw new Error('useSocket must be used within SocketProvider');
    }
    return context;
};

export const SocketProvider = ({ children }) => {
    const { user, isAuthenticated } = useAuth();

    useEffect(() => {
        if (isAuthenticated && user) {
            socketService.connect(user._id);

            return () => {
                socketService.disconnect();
            };
        }
    }, [isAuthenticated, user]);

    const value = {
        socket: socketService,
        isConnected: socketService.socket?.connected || false,
    };

    return <SocketContext.Provider value={value}>{children}</SocketContext.Provider>;
};
