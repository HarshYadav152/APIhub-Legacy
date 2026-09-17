/** @type {import('jest').Config} */
export default {
    testEnvironment: "node",
    transform: {},
    setupFiles: ["<rootDir>/tests/env.setup.js"],
    setupFilesAfterEnv: ["<rootDir>/tests/lifecycle.setup.js"],
    testTimeout: 20000,
    clearMocks: true,
    testMatch: ["**/tests/**/*.test.js"],
    collectCoverageFrom: ["src/**/*.js", "!src/server.js"],
    coverageDirectory: "coverage",
    verbose: true,
};
