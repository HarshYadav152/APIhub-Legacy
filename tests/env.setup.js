/**
 * Runs as a Jest `setupFiles` entry — meaning it executes before the test
 * framework is installed AND before the test file's own imports resolve.
 * That ordering matters: src/config/env.config.js validates process.env
 * the moment it's imported, so every required env var has to exist before
 * anything imports `app.js`. The top-level await here is what lets us
 * boot a real (in-memory) MongoDB instance and know its connection string
 * before that validation runs.
 */
import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";

process.env.NODE_ENV = "test";
process.env.ACCESS_TOKEN_SECRET ??= "test_access_token_secret_at_least_32_characters_long";
process.env.CORS_ORIGIN ??= "http://localhost:5173";
process.env.CLOUDINARY_CLOUD_NAME ??= "test";
process.env.CLOUDINARY_API_KEY ??= "test";
process.env.CLOUDINARY_API_SECRET ??= "test";
process.env.FROM_EMAIL ??= "test@example.com";

export const mongoServer = await MongoMemoryServer.create();

const uri = mongoServer.getUri();
process.env.MONGODB_URI = uri.slice(0, uri.lastIndexOf("/"));
process.env.DB_NAME = "apihub_test";

await mongoose.connect(`${process.env.MONGODB_URI}/${process.env.DB_NAME}`);
