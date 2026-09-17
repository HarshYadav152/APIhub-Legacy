import js from "@eslint/js";
import globals from "globals";
import eslintConfigPrettier from "eslint-config-prettier";

export default [
    js.configs.recommended,
    {
        languageOptions: {
            ecmaVersion: "latest",
            sourceType: "module",
            globals: {
                ...globals.node,
                ...globals.jest,
            },
        },
        rules: {
            "no-unused-vars": [
                "warn",
                { argsIgnorePattern: "^_", varsIgnorePattern: "^_", caughtErrorsIgnorePattern: "^_" },
            ],
            "no-console": ["warn", { allow: ["error"] }],
            eqeqeq: ["error", "always"],
            "no-var": "error",
            "prefer-const": "warn",
        },
    },
    eslintConfigPrettier,
    {
        // CLI/build scripts are meant to print to the console — that's
        // their whole job, unlike application code where console.log
        // should go through the Winston logger instead.
        files: ["scripts/**/*.js"],
        rules: {
            "no-console": "off",
        },
    },
    {
        ignores: ["node_modules/**", "coverage/**", "public/**"],
    },
];
