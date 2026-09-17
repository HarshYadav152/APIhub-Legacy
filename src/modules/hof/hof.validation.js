import { z } from "zod";

export const registerHofSchema = z.object({
    body: z.object({
        name: z.string().trim().min(1, "Name is required"),
        email: z.string().trim().toLowerCase().email("A valid email is required"),
        password: z.string().min(8, "Password must be at least 8 characters long"),
    }),
});

export const loginHofSchema = z.object({
    body: z.object({
        email: z.string().trim().toLowerCase().email("A valid email is required"),
        password: z.string().min(1, "Password is required"),
    }),
});

export const completeHofProfileSchema = z.object({
    body: z.object({
        number: z.string().trim().min(1, "Phone number is required"),
        dob: z
            .string()
            .trim()
            .min(1, "Date of birth is required")
            .refine((val) => !Number.isNaN(Date.parse(val)), "Date of birth must be a valid date"),
        gender: z.enum(["male", "female", "other", "prefer not to say"]),
        mstatus: z.enum(["single", "married", "divorced", "widowed", "other"]),
    }),
});
