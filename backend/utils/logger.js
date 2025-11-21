import winston from 'winston';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Define log levels
const levels = {
    error: 0,
    warn: 1,
    info: 2,
    http: 3,
    debug: 4,
};

// Define colors for each level
const colors = {
    error: 'red',
    warn: 'yellow',
    info: 'green',
    http: 'magenta',
    debug: 'white',
};

// Tell winston about the colors
winston.addColors(colors);

// Define format
const format = winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
    winston.format.colorize({ all: true }),
    winston.format.printf(
        (info) => `${info.timestamp} ${info.level}: ${info.message}`,
    ),
);

// Define transports
const transports = [
    // Console transport
    new winston.transports.Console(),
    
    // Error log file
    new winston.transports.File({
        filename: path.join(__dirname, '../../logs/error.log'),
        level: 'error',
    }),
    
    // All logs file
    new winston.transports.File({
        filename: path.join(__dirname, '../../logs/all.log'),
    }),
    
    // User activity logs
    new winston.transports.File({
        filename: path.join(__dirname, '../../logs/user-activity.log'),
        level: 'info',
    }),
];

// Create the logger
const logger = winston.createLogger({
    level: process.env.NODE_ENV === 'development' ? 'debug' : 'warn',
    levels,
    format,
    transports,
});

// Create a stream object for Morgan middleware
logger.stream = {
    write: (message) => logger.http(message.trim()),
};

// User activity logger
export const logUserActivity = (userId, action, details = {}) => {
    logger.info(`User Activity - UserID: ${userId}, Action: ${action}`, {
        userId,
        action,
        details,
        timestamp: new Date().toISOString(),
    });
};

// Authentication logger
export const logAuth = (action, email, success, details = {}) => {
    const level = success ? 'info' : 'warn';
    logger[level](`Auth - ${action} - Email: ${email} - Success: ${success}`, {
        action,
        email,
        success,
        details,
        timestamp: new Date().toISOString(),
    });
};

// Error logger
export const logError = (error, context = {}) => {
    logger.error(`Error: ${error.message}`, {
        error: {
            message: error.message,
            stack: error.stack,
            name: error.name,
        },
        context,
        timestamp: new Date().toISOString(),
    });
};

// API logger
export const logAPI = (method, endpoint, statusCode, userId = null, details = {}) => {
    logger.http(`API - ${method} ${endpoint} - Status: ${statusCode}`, {
        method,
        endpoint,
        statusCode,
        userId,
        details,
        timestamp: new Date().toISOString(),
    });
};

export default logger;