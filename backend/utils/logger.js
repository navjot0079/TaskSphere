import winston from 'winston';

// Define log format
const logFormat = winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.splat(),
    winston.format.json()
);

// Create logger
const logger = winston.createLogger({
    level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
    format: logFormat,
    transports: [
        // Write all logs to console
        new winston.transports.Console({
            format: winston.format.combine(
                winston.format.colorize(),
                winston.format.simple()
            ),
        }),
        // Write all logs with level 'error' and below to error.log
        new winston.transports.File({
            filename: 'logs/error.log',
            level: 'error'
        }),
        // Write all logs to combined.log
        new winston.transports.File({
            filename: 'logs/combined.log'
        }),
    ],
});

export default logger;
