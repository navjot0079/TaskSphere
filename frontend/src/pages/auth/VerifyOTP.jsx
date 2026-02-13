import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { authAPI } from '../../services/api';
import Button from '../../components/ui/Button';
import toast from 'react-hot-toast';

const VerifyOTP = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { userId, email } = location.state || {};

    const [otp, setOtp] = useState(['', '', '', '', '', '']);
    const [loading, setLoading] = useState(false);

    const handleChange = (index, value) => {
        if (value.length > 1) return;

        const newOtp = [...otp];
        newOtp[index] = value;
        setOtp(newOtp);

        // Auto-focus next input
        if (value && index < 5) {
            document.getElementById(`otp-${index + 1}`).focus();
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const otpValue = otp.join('');

        if (otpValue.length !== 6) {
            toast.error('Please enter a valid 6-digit OTP');
            return;
        }

        setLoading(true);

        try {
            await authAPI.verifyOTP({ userId, otp: otpValue });
            toast.success('Email verified successfully!');
            navigate('/login');
        } catch (error) {
            toast.error(error.response?.data?.message || 'Verification failed');
        } finally {
            setLoading(false);
        }
    };

    const handleResend = async () => {
        try {
            await authAPI.resendOTP({ userId });
            toast.success('OTP resent successfully');
            setOtp(['', '', '', '', '', '']);
        } catch (error) {
            toast.error('Failed to resend OTP');
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8"
        >
            <div className="text-center mb-8">
                <h2 className="text-3xl font-bold text-gray-900 dark:text-white">Verify Email</h2>
                <p className="text-gray-600 dark:text-gray-400 mt-2">
                    Enter the 6-digit code sent to
                </p>
                <p className="text-primary-600 font-medium">{email}</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                <div className="flex justify-center space-x-3">
                    {otp.map((digit, index) => (
                        <input
                            key={index}
                            id={`otp-${index}`}
                            type="text"
                            maxLength={1}
                            value={digit}
                            onChange={(e) => handleChange(index, e.target.value)}
                            className="w-12 h-14 text-center text-2xl font-bold border-2 border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-primary-500 focus:ring-2 focus:ring-primary-500"
                        />
                    ))}
                </div>

                <Button type="submit" fullWidth loading={loading}>
                    Verify Email
                </Button>

                <div className="text-center">
                    <button
                        type="button"
                        onClick={handleResend}
                        className="text-primary-600 hover:text-primary-700 text-sm font-medium"
                    >
                        Resend OTP
                    </button>
                </div>
            </form>
        </motion.div>
    );
};

export default VerifyOTP;
