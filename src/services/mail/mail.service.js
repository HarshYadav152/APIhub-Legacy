import nodemailer from "nodemailer";
import { env } from "../../config/env.config.js";
import { logger } from "../../config/logger.config.js";
import { renderTemplate } from "./template.util.js";
import { OTP_EXPIRY_MINUTES } from "../otp/otp.service.js";

const transporter = nodemailer.createTransport({
    service: env.EMAIL_SERVICE,
    host: "smtp.gmail.com",
    port: 587,
    secure: false,
    auth: {
        user: env.FROM_EMAIL,
        pass: env.APP_PASSWORD,
    },
    // nodemailer has no timeout by default — an unreachable or slow SMTP
    // server would otherwise hang a worker slot indefinitely instead of
    // failing into BullMQ's retry/backoff policy within a bounded time.
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 20_000,
});

/**
 * The actual SMTP send. This is called by the email worker process
 * (src/worker.js), not directly from request handlers — see
 * src/services/queue/email.queue.js for what request handlers call
 * instead, and why.
 */
export const sendVerificationEmail = async (email, otp) => {
    try {
        const html = await renderTemplate("otp-verification.html", {
            OTP: otp,
            EXPIRY_MINUTES: OTP_EXPIRY_MINUTES,
        });

        await transporter.sendMail({
            from: env.FROM_EMAIL,
            to: email,
            subject: "Email Verification - APIHub",
            html,
        });

        return true;
    } catch (error) {
        logger.error("Email sending error:", error);
        return false;
    }
};
