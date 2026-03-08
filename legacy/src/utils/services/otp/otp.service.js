import crypto from 'crypto';

// Generate 6-digit OTP
export const generateOTP = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
};

// Hash OTP for secure storage
export const hashOTP = (otp) => {
    return crypto.createHash('sha256').update(otp).digest('hex');
};

// Valid for 10 minutes
export const getOtpExpiry = () => {
    return new Date(Date.now() + 10 * 60 * 1000);
};