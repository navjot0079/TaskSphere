import { useState, useEffect } from 'react';
import { Camera, Save, Lock } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { userAPI } from '../services/api';
import Button from '../components/ui/Button';
import Card, { CardHeader, CardBody } from '../components/ui/Card';
import Input from '../components/ui/Input';
import { useTheme } from '../context/ThemeContext';
import toast from 'react-hot-toast';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
const SERVER_URL = API_BASE_URL.replace('/api', '');

const Profile = () => {
    const { user, setUser } = useAuth();
    const { theme, setTheme } = useTheme();
    const [loading, setLoading] = useState(false);
    const [avatarFile, setAvatarFile] = useState(null);
    const [avatarPreview, setAvatarPreview] = useState(null);
    const [formData, setFormData] = useState({
        name: user?.name || '',
        email: user?.email || '',
        phone: user?.phone || '',
    });
    const [passwordData, setPasswordData] = useState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
    });
    const [notificationSettings, setNotificationSettings] = useState({
        emailNotifications: true,
        pushNotifications: true,
        taskAssignments: true,
        dueDateReminders: true,
        projectUpdates: true,
    });

    const handleAvatarChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            // Validate file type
            if (!file.type.startsWith('image/')) {
                toast.error('Please select an image file');
                return;
            }
            // Validate file size (max 5MB)
            if (file.size > 5 * 1024 * 1024) {
                toast.error('Image size should be less than 5MB');
                return;
            }
            setAvatarFile(file);
            // Create preview
            const reader = new FileReader();
            reader.onloadend = () => {
                setAvatarPreview(reader.result);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleUploadAvatar = async () => {
        if (!avatarFile) {
            toast.error('Please select an image first');
            return;
        }

        setLoading(true);
        try {
            const formData = new FormData();
            formData.append('avatar', avatarFile);

            console.log('Uploading avatar:', avatarFile.name);
            const { data } = await userAPI.uploadAvatar(formData);
            console.log('Upload response:', data);

            setUser(data.user);
            toast.success('Avatar updated successfully!');

            // Clear the preview and file
            setAvatarFile(null);
            setAvatarPreview(null);

            // Reset file input
            const fileInput = document.getElementById('avatar-upload');
            if (fileInput) fileInput.value = '';
        } catch (error) {
            console.error('Avatar upload error:', error);
            console.error('Error response:', error.response);
            toast.error(error.response?.data?.message || 'Failed to upload avatar');
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateProfile = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            const { data } = await userAPI.updateProfile(formData);
            setUser(data.user);
            toast.success('Profile updated successfully!');
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to update profile');
        } finally {
            setLoading(false);
        }
    };

    const handleChangePassword = async (e) => {
        e.preventDefault();

        if (passwordData.newPassword !== passwordData.confirmPassword) {
            toast.error('Passwords do not match');
            return;
        }

        if (passwordData.newPassword.length < 6) {
            toast.error('Password must be at least 6 characters');
            return;
        }

        setLoading(true);
        try {
            await userAPI.changePassword({
                currentPassword: passwordData.currentPassword,
                newPassword: passwordData.newPassword,
            });
            toast.success('Password changed successfully!');
            setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to change password');
        } finally {
            setLoading(false);
        }
    };

    const handleNotificationToggle = async (key) => {
        const newSettings = { ...notificationSettings, [key]: !notificationSettings[key] };
        setNotificationSettings(newSettings);

        try {
            await userAPI.updateNotificationSettings(newSettings);
            toast.success('Settings updated');
        } catch (error) {
            toast.error('Failed to update settings');
        }
    };

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Profile</h1>
                <p className="text-gray-600 dark:text-gray-400 mt-1">
                    Manage your account settings and preferences
                </p>
            </div>

            {/* Profile Information */}
            <Card>
                <CardHeader>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        Profile Information
                    </h3>
                </CardHeader>
                <CardBody>
                    <div className="flex items-center mb-6">
                        <div className="relative">
                            <input
                                type="file"
                                id="avatar-upload"
                                accept="image/*"
                                onChange={handleAvatarChange}
                                className="hidden"
                            />
                            {avatarPreview || user?.avatar ? (
                                <img
                                    src={avatarPreview || `${SERVER_URL}${user.avatar}`}
                                    alt="Avatar"
                                    className="w-24 h-24 rounded-full object-cover border-4 border-white dark:border-gray-800 shadow-lg"
                                />
                            ) : (
                                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary-500 to-purple-600 flex items-center justify-center text-white text-3xl font-bold shadow-lg">
                                    {user?.name?.charAt(0).toUpperCase()}
                                </div>
                            )}
                            <label
                                htmlFor="avatar-upload"
                                className="absolute bottom-0 right-0 p-2 bg-white dark:bg-gray-800 rounded-full shadow-lg border border-gray-200 dark:border-gray-700 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                            >
                                <Camera className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                            </label>
                        </div>
                        <div className="ml-6 flex-1">
                            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                                {user?.name}
                            </h2>
                            <p className="text-gray-600 dark:text-gray-400">{user?.email}</p>
                            <span className="inline-block mt-2 px-3 py-1 bg-primary-100 dark:bg-primary-900 text-primary-700 dark:text-primary-300 rounded-full text-sm font-medium capitalize">
                                {user?.role}
                            </span>
                            {avatarPreview && (
                                <div className="mt-3 flex items-center gap-2">
                                    <Button
                                        size="sm"
                                        onClick={handleUploadAvatar}
                                        disabled={loading}
                                        icon={<Save className="w-4 h-4" />}
                                    >
                                        Save Avatar
                                    </Button>
                                    <Button
                                        size="sm"
                                        variant="secondary"
                                        onClick={() => {
                                            setAvatarFile(null);
                                            setAvatarPreview(null);
                                            const fileInput = document.getElementById('avatar-upload');
                                            if (fileInput) fileInput.value = '';
                                        }}
                                        disabled={loading}
                                    >
                                        Cancel
                                    </Button>
                                </div>
                            )}
                        </div>
                    </div>

                    <form onSubmit={handleUpdateProfile} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Input
                                label="Full Name"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                required
                            />
                            <Input
                                label="Email"
                                type="email"
                                value={formData.email}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                required
                            />
                        </div>
                        <Input
                            label="Phone Number"
                            type="tel"
                            value={formData.phone}
                            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        />
                        <div className="flex justify-end">
                            <Button type="submit" icon={<Save className="w-5 h-5" />} disabled={loading}>
                                Save Changes
                            </Button>
                        </div>
                    </form>
                </CardBody>
            </Card>

            {/* Change Password */}
            <Card>
                <CardHeader>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        Change Password
                    </h3>
                </CardHeader>
                <CardBody>
                    <form onSubmit={handleChangePassword} className="space-y-4">
                        <Input
                            label="Current Password"
                            type="password"
                            value={passwordData.currentPassword}
                            onChange={(e) =>
                                setPasswordData({ ...passwordData, currentPassword: e.target.value })
                            }
                            required
                        />
                        <Input
                            label="New Password"
                            type="password"
                            value={passwordData.newPassword}
                            onChange={(e) =>
                                setPasswordData({ ...passwordData, newPassword: e.target.value })
                            }
                            required
                        />
                        <Input
                            label="Confirm New Password"
                            type="password"
                            value={passwordData.confirmPassword}
                            onChange={(e) =>
                                setPasswordData({ ...passwordData, confirmPassword: e.target.value })
                            }
                            required
                        />
                        <div className="flex justify-end">
                            <Button
                                type="submit"
                                icon={<Lock className="w-5 h-5" />}
                                disabled={loading}
                            >
                                Update Password
                            </Button>
                        </div>
                    </form>
                </CardBody>
            </Card>

            {/* Preferences */}
            <Card>
                <CardHeader>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        Preferences
                    </h3>
                </CardHeader>
                <CardBody>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Theme
                            </label>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => setTheme('light')}
                                    className={`px-4 py-2 rounded-lg border ${theme === 'light'
                                        ? 'bg-primary-100 dark:bg-primary-900 border-primary-600 text-primary-700 dark:text-primary-300'
                                        : 'border-gray-300 dark:border-gray-600'
                                        }`}
                                >
                                    Light
                                </button>
                                <button
                                    onClick={() => setTheme('dark')}
                                    className={`px-4 py-2 rounded-lg border ${theme === 'dark'
                                        ? 'bg-primary-100 dark:bg-primary-900 border-primary-600 text-primary-700 dark:text-primary-300'
                                        : 'border-gray-300 dark:border-gray-600'
                                        }`}
                                >
                                    Dark
                                </button>
                            </div>
                        </div>

                        <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                            <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-3">
                                Notification Settings
                            </h4>
                            <div className="space-y-3">
                                {Object.entries(notificationSettings).map(([key, value]) => (
                                    <label key={key} className="flex items-center justify-between cursor-pointer">
                                        <span className="text-sm text-gray-700 dark:text-gray-300 capitalize">
                                            {key.replace(/([A-Z])/g, ' $1').trim()}
                                        </span>
                                        <div className="relative">
                                            <input
                                                type="checkbox"
                                                checked={value}
                                                onChange={() => handleNotificationToggle(key)}
                                                className="sr-only peer"
                                            />
                                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 dark:peer-focus:ring-primary-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-primary-600"></div>
                                        </div>
                                    </label>
                                ))}
                            </div>
                        </div>
                        
                    </div>
                </CardBody>
            </Card>
        </div>
    );
};

export default Profile;
