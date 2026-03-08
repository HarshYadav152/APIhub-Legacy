import nodemailer from 'nodemailer';
import dotenv from "dotenv";
dotenv.config();

const transporter = nodemailer.createTransport({
    service: process.env.EMAIL_SERVICE, // e.g., 'gmail'
    host:'smtp.gmail.com',
    port:587,
    secure:false,
    auth: {
        user: process.env.FROM_EMAIL,
        pass: process.env.APP_PASSWORD
    }
});

export const sendVerificationEmail = async (email, otp) => {
    try {
        const mailOptions = {
            from: process.env.FROM_EMAIL,
            to: email,
            subject: 'Email Verification - APIHub',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2>Email Verification</h2>
                    <p>Your verification code is: <strong>${otp}</strong></p>
                    <p>This code will expire in 10 minutes.</p>
                    <p>If you didn't request this code, please ignore this email.</p>
                </div>
            `
        };

        await transporter.sendMail(mailOptions);
        return true;
    } catch (error) {
        console.error('Email sending error:', error);
        return false;
    }
};