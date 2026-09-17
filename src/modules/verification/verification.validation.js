import { z } from "zod";

const roleField = z.enum(["user", "hof"]).default("user");

export const sendOtpSchema = z.object({
    body: z.object({
        email: z.string().trim().toLowerCase().email("A valid email is required"),
        role: roleField,
    }),
});

export const verifyOtpSchema = z.object({
    body: z.object({
        email: z.string().trim().toLowerCase().email("A valid email is required"),
        otp: z.string().trim().min(1, "OTP is required"),
        role: roleField,
    }),
});

export const revokeVerificationParamsSchema = z.object({
    params: z.object({
        email: z.string().trim().toLowerCase().email("A valid email is required"),
    }),
});
