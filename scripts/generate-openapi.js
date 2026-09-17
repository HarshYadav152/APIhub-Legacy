import fs from "fs/promises";
import path from "path";
import { z } from "zod";
import { extendZodWithOpenApi, OpenAPIRegistry, OpenApiGeneratorV3 } from "@asteasolutions/zod-to-openapi";

import {
    registerUserSchema,
    loginUserSchema,
    completeMemberProfileSchema,
} from "../src/modules/users/user.validation.js";
import {
    registerHofSchema,
    loginHofSchema,
    completeHofProfileSchema,
} from "../src/modules/hof/hof.validation.js";
import {
    sendOtpSchema,
    verifyOtpSchema,
    revokeVerificationParamsSchema,
} from "../src/modules/verification/verification.validation.js";
import {
    createFamilySchema,
    familyMemberParamsSchema,
    paginationSchema,
} from "../src/modules/family/family.validation.js";
import {
    registerKeysSchema,
    fetchPreKeyBundleSchema,
    sendMessageSchema,
    conversationSchema,
    markReadSchema,
} from "../src/modules/messaging/messaging.validation.js";

extendZodWithOpenApi(z);

const registry = new OpenAPIRegistry();

/**
 * One entry per documented route. `schema` (where present) is one of
 * this app's actual *.validation.js Zod schemas — the same object the
 * `validate` middleware enforces at request time — so the generated
 * spec describes what the API really accepts instead of a hand-written
 * doc that can silently drift from the code. Regenerate any time a
 * validation schema changes: `npm run docs:generate`.
 */
const routes = [
    {
        method: "post",
        path: "/members/register-user",
        tag: "Users",
        summary: "Register a new family member account",
        schema: registerUserSchema,
        responses: {
            201: "Registered, pending email verification",
            400: "Validation error",
            409: "Email already registered",
        },
    },
    {
        method: "post",
        path: "/members/login-user",
        tag: "Users",
        summary: "Log in and receive access + refresh token cookies",
        schema: loginUserSchema,
        responses: { 200: "Logged in", 401: "Invalid credentials" },
    },
    {
        method: "post",
        path: "/members/refresh-token",
        tag: "Users",
        summary: "Rotate an access/refresh token pair",
        responses: {
            200: "New token pair issued",
            401: "Missing, invalid, expired, or already-used refresh token",
        },
    },
    {
        method: "post",
        path: "/members/logout",
        tag: "Users",
        summary: "Revoke the current refresh token and clear auth cookies",
        auth: true,
        responses: { 200: "Logged out", 401: "Not authenticated" },
    },
    {
        method: "post",
        path: "/members/complete-profile",
        tag: "Users",
        summary:
            "Complete a member's profile (multipart form; requires an uploaded file not represented in this schema)",
        schema: completeMemberProfileSchema,
        auth: true,
        responses: {
            200: "Profile updated",
            400: "Validation error or missing file",
            401: "Not authenticated",
        },
    },

    {
        method: "post",
        path: "/hof/register",
        tag: "HOF",
        summary: "Register a new head-of-family account",
        schema: registerHofSchema,
        responses: { 201: "Registered", 400: "Validation error", 409: "Email already registered" },
    },
    {
        method: "post",
        path: "/hof/entry",
        tag: "HOF",
        summary: "Log in as a head of family",
        schema: loginHofSchema,
        responses: { 200: "Logged in", 401: "Invalid credentials" },
    },
    {
        method: "post",
        path: "/hof/refresh-token",
        tag: "HOF",
        summary: "Rotate an access/refresh token pair",
        responses: {
            200: "New token pair issued",
            401: "Missing, invalid, expired, or already-used refresh token",
        },
    },
    {
        method: "post",
        path: "/hof/logout",
        tag: "HOF",
        summary: "Revoke the current refresh token and clear auth cookies",
        auth: true,
        responses: { 200: "Logged out", 401: "Not authenticated" },
    },
    {
        method: "post",
        path: "/hof/complete-profile",
        tag: "HOF",
        summary:
            "Complete a HOF's profile (multipart form; requires an uploaded file not represented in this schema)",
        schema: completeHofProfileSchema,
        auth: true,
        responses: {
            200: "Profile updated",
            400: "Validation error or missing file",
            401: "Not authenticated",
        },
    },

    {
        method: "post",
        path: "/verify/send-otp",
        tag: "Verification",
        summary: "Send a one-time verification code to an email",
        schema: sendOtpSchema,
        responses: {
            200: "OTP sent (or already verified)",
            404: "No matching account",
            429: "Too many attempts",
        },
    },
    {
        method: "post",
        path: "/verify/verify-otp",
        tag: "Verification",
        summary: "Verify a one-time code",
        schema: verifyOtpSchema,
        responses: { 200: "Email verified", 400: "Invalid or expired OTP" },
    },
    {
        method: "get",
        path: "/verify/status",
        tag: "Verification",
        summary: "Get the calling user's verification status",
        auth: true,
        responses: { 200: "Verification status" },
    },
    {
        method: "get",
        path: "/verify/hof-status",
        tag: "Verification",
        summary: "Get the calling HOF's verification status",
        auth: true,
        responses: { 200: "Verification status" },
    },
    {
        method: "post",
        path: "/verify/revoke-member/{email}",
        tag: "Verification",
        summary: "Revoke a family member's email verification (must be in the calling HOF's own family)",
        schema: revokeVerificationParamsSchema,
        auth: true,
        responses: {
            200: "Revoked",
            403: "Target is not a member of the calling HOF's family",
            404: "No matching account",
        },
    },
    {
        method: "post",
        path: "/verify/revoke-hof/{email}",
        tag: "Verification",
        summary: "Revoke your own HOF email verification (self only)",
        schema: revokeVerificationParamsSchema,
        auth: true,
        responses: { 200: "Revoked", 403: "Email does not match the calling HOF" },
    },

    {
        method: "post",
        path: "/family/create",
        tag: "Family",
        summary: "Create a family (HOF only, requires verified email)",
        schema: createFamilySchema,
        auth: true,
        responses: {
            201: "Family created",
            400: "Validation error",
            403: "Email not verified",
            409: "HOF already has a family",
        },
    },
    {
        method: "post",
        path: "/family/add-member/{userId}",
        tag: "Family",
        summary: "Add an existing user to the calling HOF's family",
        schema: familyMemberParamsSchema,
        auth: true,
        responses: {
            200: "Member added (or already present)",
            400: "Invalid userId or user does not exist",
            403: "Email not verified",
        },
    },
    {
        method: "post",
        path: "/family/remove-member/{userId}",
        tag: "Family",
        summary: "Remove a member from the calling HOF's family",
        schema: familyMemberParamsSchema,
        auth: true,
        responses: { 200: "Member removed", 400: "Member is not in this family" },
    },
    {
        method: "get",
        path: "/family/total-member",
        tag: "Family",
        summary: "Get the calling HOF's family member count",
        auth: true,
        responses: { 200: "Member count" },
    },
    {
        method: "get",
        path: "/family/get-all-members",
        tag: "Family",
        summary: "List family members, paginated (cached)",
        schema: paginationSchema,
        auth: true,
        responses: { 200: "Paginated member list" },
    },
    {
        method: "post",
        path: "/family/view-hof",
        tag: "Family",
        summary: "View the calling HOF's family details (cached)",
        auth: true,
        responses: { 200: "Family details", 404: "No family created yet" },
    },
    {
        method: "get",
        path: "/family/get-id",
        tag: "Family",
        summary: "Get the calling HOF's family ID",
        auth: true,
        responses: { 200: "Family ID", 404: "No family created yet" },
    },
    {
        method: "post",
        path: "/family/view-member",
        tag: "Family",
        summary: "View family details as a member (cached)",
        auth: true,
        responses: { 200: "Family details", 403: "Not a member of this family" },
    },

    {
        method: "get",
        path: "/health",
        tag: "System",
        summary: "Detailed health check (DB state, memory)",
        responses: { 200: "Service is healthy", 503: "Service is degraded" },
    },

    {
        method: "post",
        path: "/messaging/keys",
        tag: "Messaging",
        summary: "Publish/replace this account's public key material and top up one-time prekeys",
        schema: registerKeysSchema,
        auth: true,
        responses: { 200: "Keys registered", 400: "Validation error" },
    },
    {
        method: "get",
        path: "/messaging/keys/{accountType}/{accountId}",
        tag: "Messaging",
        summary: "Fetch another family member's prekey bundle to start a new session (X3DH)",
        schema: fetchPreKeyBundleSchema,
        auth: true,
        responses: {
            200: "Prekey bundle retrieved (oneTimePreKey may be null if that account's supply is exhausted)",
            403: "Target is not a member of the caller's family",
            404: "Target has not published keys yet",
        },
    },
    {
        method: "post",
        path: "/messaging/messages",
        tag: "Messaging",
        summary: "Send an encrypted message (ciphertext is opaque to this server)",
        schema: sendMessageSchema,
        auth: true,
        responses: { 201: "Message sent", 403: "Recipient is not a member of the caller's family" },
    },
    {
        method: "get",
        path: "/messaging/messages/{withAccountType}/{withAccountId}",
        tag: "Messaging",
        summary: "Fetch conversation history with another family member, paginated",
        schema: conversationSchema,
        auth: true,
        responses: { 200: "Conversation retrieved", 403: "Not a member of the caller's family" },
    },
    {
        method: "patch",
        path: "/messaging/messages/{messageId}/read",
        tag: "Messaging",
        summary: "Mark a message as read (only the actual recipient can)",
        schema: markReadSchema,
        auth: true,
        responses: { 200: "Marked as read", 404: "Message not found (or you're not its recipient)" },
    },
];

for (const route of routes) {
    const request = {};
    if (route.schema?.shape?.body) {
        request.body = { content: { "application/json": { schema: route.schema.shape.body } } };
    }
    if (route.schema?.shape?.params) {
        request.params = route.schema.shape.params;
    }
    if (route.schema?.shape?.query) {
        request.query = route.schema.shape.query;
    }

    registry.registerPath({
        method: route.method,
        path: route.path,
        tags: [route.tag],
        summary: route.summary,
        ...(Object.keys(request).length ? { request } : {}),
        ...(route.auth ? { security: [{ cookieAuth: [] }] } : {}),
        responses: Object.fromEntries(
            Object.entries(route.responses).map(([status, description]) => [status, { description }])
        ),
    });
}

const packageJson = JSON.parse(await fs.readFile(new URL("../package.json", import.meta.url), "utf-8"));

const generator = new OpenApiGeneratorV3(registry.definitions);
const document = generator.generateDocument({
    openapi: "3.0.0",
    info: {
        title: "APIhub Backend",
        version: packageJson.version,
        description:
            "Family-management backend API. Generated from this codebase's Zod validation schemas " +
            "(scripts/generate-openapi.js) rather than hand-maintained, so it can't silently drift from " +
            "what the API actually accepts. Regenerate with `npm run docs:generate`.",
    },
    servers: [{ url: "/api/v1" }],
});

document.components = {
    ...document.components,
    securitySchemes: {
        cookieAuth: {
            type: "apiKey",
            in: "cookie",
            name: "UaccessToken / HaccessToken (or an Authorization: Bearer header)",
        },
    },
};

const outPath = path.join(process.cwd(), "docs", "openapi.json");
await fs.writeFile(outPath, JSON.stringify(document, null, 2));
console.log(`OpenAPI spec written to ${outPath} (${routes.length} routes)`);
