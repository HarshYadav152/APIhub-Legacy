import winston from "winston";
import { env, isProduction } from "./env.config.js";

const { combine, timestamp, printf, colorize, errors, json } = winston.format;

const devFormat = combine(
    colorize(),
    timestamp({ format: "HH:mm:ss" }),
    errors({ stack: true }),
    printf(({ level, message, timestamp: ts, stack, ...meta }) => {
        const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : "";
        return `${ts} [${level}]: ${stack || message}${metaStr}`;
    })
);

const prodFormat = combine(timestamp(), errors({ stack: true }), json());

export const logger = winston.createLogger({
    level: env.LOG_LEVEL,
    format: isProduction ? prodFormat : devFormat,
    transports: [new winston.transports.Console()],
    exitOnError: false,
});

// Thin wrapper so route/middleware code reads naturally: httpLogStream.write(...)
export const httpLogStream = {
    write: (message) => logger.http(message.trim()),
};
