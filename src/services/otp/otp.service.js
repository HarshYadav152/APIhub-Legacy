import crypto from "crypto";

// Generate 6-digit OTP
export const generateOTP = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
};

// Hash OTP for secure storage
export const hashOTP = (otp) => {
    return crypto.createHash("sha256").update(otp).digest("hex");
};

// Single source of truth for OTP validity — both the expiry timestamp
// stored on the account and the "expires in N minutes" copy in the
// verification email read from here, so they can't drift out of sync.
export const OTP_EXPIRY_MINUTES = 10;

export const getOtpExpiry = () => {
    return new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);
};
