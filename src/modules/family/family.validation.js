import { z } from "zod";

const objectIdParam = z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid ID format");

export const createFamilySchema = z.object({
    body: z.object({
        fname: z.string().trim().min(1, "Family name is required"),
        fdesc: z.string().trim().min(1, "Family description is required"),
        fpicture: z.string().trim().min(1, "Family picture is required"),
        estd: z
            .string()
            .trim()
            .min(1, "Establishment date is required")
            .refine((val) => !Number.isNaN(Date.parse(val)), "Establishment date must be a valid date"),
    }),
});

export const familyMemberParamsSchema = z.object({
    params: z.object({
        userId: objectIdParam,
    }),
});

export const paginationSchema = z.object({
    query: z.object({
        page: z.coerce.number().int().positive().default(1),
        limit: z.coerce.number().int().positive().max(100).default(20),
    }),
});
