import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { SocketProvider } from './context/SocketContext';

// Pages
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import VerifyOTP from './pages/auth/VerifyOTP';
import ForgotPassword from './pages/auth/ForgotPassword';
import ResetPassword from './pages/auth/ResetPassword';

import Dashboard from './pages/Dashboard';
import AdminDashboard from './pages/AdminDashboard';
import UserDashboard from './pages/UserDashboard';
import Tasks from './pages/Tasks';
import TaskDetails from './pages/TaskDetails';
import AdminTasks from './pages/AdminTasks';
import Projects from './pages/Projects';
import ProjectDetails from './pages/ProjectDetails';
import Chat from './pages/Chat';
// import Files from './pages/Files';
import Profile from './pages/Profile';
import AdminPanel from './pages/AdminPanel';
import NotFound from './pages/NotFound';

// Layout
import MainLayout from './components/layout/MainLayout';
import AuthLayout from './components/layout/AuthLayout';
import PrivateRoute from './components/PrivateRoute';

function App() {
    return (
        <Router>
            <ThemeProvider>
                <AuthProvider>
                    <SocketProvider>
                        <Toaster
                            position="top-right"
                            toastOptions={{
                                duration: 3000,
                                style: {
                                    background: '#333',
                                    color: '#fff',
                                },
                                success: {
                                    iconTheme: {
                                        primary: '#10b981',
                                        secondary: '#fff',
                                    },
                                },
                                error: {
                                    iconTheme: {
                                        primary: '#ef4444',
                                        secondary: '#fff',
                                    },
                                },
                            }}
                        />

                        <Routes>
                            {/* Auth Routes */}
                            <Route element={<AuthLayout />}>
                                <Route path="/login" element={<Login />} />
                                <Route path="/register" element={<Register />} />
                                <Route path="/verify-otp" element={<VerifyOTP />} />
                                <Route path="/forgot-password" element={<ForgotPassword />} />
                                <Route path="/reset-password" element={<ResetPassword />} />
                            </Route>

                            {/* Protected Routes */}
                            <Route element={<PrivateRoute><MainLayout /></PrivateRoute>}>
                                <Route path="/" element={<Navigate to="/dashboard" replace />} />
                                <Route path="/dashboard" element={<Dashboard />} />
                                <Route path="/admin-dashboard" element={<AdminDashboard />} />
                                <Route path="/user-dashboard" element={<UserDashboard />} />
                                <Route path="/tasks" element={<Tasks />} />
                                <Route path="/tasks/:id" element={<TaskDetails />} />
                                <Route path="/admin-tasks" element={<AdminTasks />} />
                                <Route path="/projects" element={<Projects />} />
                                <Route path="/projects/:id" element={<ProjectDetails />} />
                                <Route path="/chat" element={<Chat />} />
                                {/* <Route path="/files" element={<Files />} /> */}
                                <Route path="/profile" element={<Profile />} />
                                <Route path="/admin" element={<AdminPanel />} />
                            </Route>

                            {/* 404 */}
                            <Route path="*" element={<NotFound />} />
                        </Routes>
                    </SocketProvider>
                </AuthProvider>
            </ThemeProvider>
        </Router>
    );
}

export default App;
