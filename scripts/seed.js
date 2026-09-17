/**
 * Placeholder for local dev database seeding.
 * Fill in per-module seed logic as each domain module matures
 * (Phase 1+). Run with: node scripts/seed.js
 */
import { connectDB, disconnectDB } from "../src/config/database.config.js";
import { logger } from "../src/config/logger.config.js";

const seed = async () => {
    await connectDB();

    logger.info("No seed data defined yet — add module-specific seeding here.");

    await disconnectDB();
};

seed().catch((error) => {
    logger.error("Seeding failed:", error);
    process.exit(1);
});
