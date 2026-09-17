import mongoose from "mongoose";
// Same module instance as loaded by env.setup.js (ESM caches by resolved
// path per test file) — reusing it here just to call mongoServer.stop().
import { mongoServer } from "./env.setup.js";

afterEach(async () => {
    const collections = mongoose.connection.collections;
    for (const key of Object.keys(collections)) {
        await collections[key].deleteMany({});
    }
});

afterAll(async () => {
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
    await mongoServer.stop();
});
