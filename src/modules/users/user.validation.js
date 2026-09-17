import { z } from "zod";

export const registerUserSchema = z.object({
    body: z.object({
        uname: z.string().trim().min(1, "Name is required"),
        uemail: z.string().trim().toLowerCase().email("A valid email is required"),
        upassword: z.string().min(8, "Password must be at least 8 characters long"),
    }),
});

export const loginUserSchema = z.object({
    body: z.object({
        uemail: z.string().trim().toLowerCase().email("A valid email is required"),
        upassword: z.string().min(1, "Password is required"),
    }),
});

export const completeMemberProfileSchema = z.object({
    body: z.object({
        number: z.string().trim().min(1, "Phone number is required"),
        dob: z
            .string()
            .trim()
            .min(1, "Date of birth is required")
            .refine((val) => !Number.isNaN(Date.parse(val)), "Date of birth must be a valid date"),
        gender: z.enum(["male", "female", "other", "prefer not to say"]),
        street: z.string().trim().min(1, "Street is required"),
        city: z.string().trim().min(1, "City is required"),
        country: z.string().trim().min(1, "Country is required"),
        pincode: z.string().trim().min(1, "Postal code is required"),
        rstatus: z.enum(["single", "married", "divorced", "widowed", "other"]),
        rtohof: z.enum(["spouse", "child", "sibling", "parent", "grandparent", "grandchild", "other"]),
    }),
});
