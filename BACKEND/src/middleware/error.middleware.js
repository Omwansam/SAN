const config = require('../config/env');

// Prisma Error Code Reference: https://www.prisma.io/docs/reference/api-reference/error-reference
const PRISMA_ERROR_CODES = {
    // Unique constraint violations
    P2002: { status: 409, message: (meta) => `Duplicate value for: ${meta?.target?.join(', ') || 'field'}` },
    
    // Foreign key constraint failed
    P2003: { status: 400, message: () => 'Related resource not found (Foreign Key Constraint Failed)' },
    
    // Record not found
    P2025: { status: 404, message: (meta) => meta?.cause || 'Resource not found' },
    
    // Required field missing
    P2011: { status: 400, message: (meta) => `Null constraint violation on: ${meta?.constraint}` },
    
    // Invalid data format
    P2005: { status: 400, message: (meta) => `Invalid value for field: ${meta?.field_name}` },
    
    // Query interpretation error
    P2016: { status: 400, message: () => 'Invalid query parameters' },
    
    // Too many records found (for unique query)
    P2008: { status: 400, message: () => 'Multiple records found where one expected' },
    
    // Database connection failed
    P1001: { status: 503, message: () => 'Database server unreachable' },
    
    // Database timeout
    P1008: { status: 504, message: () => 'Database operation timed out' },
    
    // Authentication failed
    P1000: { status: 500, message: () => 'Database authentication failed' },
};

const errorHandler = (err, req, res, next) => {
    let error = { ...err };
    error.message = err.message;

    // Log error details (development only)
    if (config.NODE_ENV === 'development') {
        console.error('Error:', {
            name: err.name,
            code: err.code,
            message: err.message,
            stack: err.stack,
            meta: err.meta,
        });
    }

    // Handle Prisma Known Request Errors
    if (err.name === 'PrismaClientKnownRequestError') {
        const prismaError = PRISMA_ERROR_CODES[err.code];
        
        if (prismaError) {
            error.statusCode = prismaError.status;
            error.message = prismaError.message(err.meta);
        } else {
            // Unknown Prisma error code
            error.statusCode = 500;
            error.message = config.NODE_ENV === 'development' 
                ? `Database error: ${err.code}` 
                : 'Database operation failed';
        }
    }

    // Prisma Validation Error (wrong types, missing required fields)
    else if (err.name === 'PrismaClientValidationError') {
        error.statusCode = 400;
        // Extract field name from error message if possible
        const fieldMatch = err.message.match(/argument `([^`]+)`/);
        const field = fieldMatch ? fieldMatch[1] : 'input';
        error.message = `Invalid data format for: ${field}`;
    }

    // Prisma Initialization Error (DB down, wrong credentials)
    else if (err.name === 'PrismaClientInitializationError') {
        error.statusCode = 503;
        error.message = 'Service temporarily unavailable. Please try again later.';
    }

    // Prisma Rust Panic (rare, critical error)
    else if (err.name === 'PrismaClientRustPanicError') {
        error.statusCode = 500;
        error.message = 'Critical database error occurred';
        // Alert monitoring service here
    }

    // JWT Errors
    else if (err.name === 'JsonWebTokenError') {
        error.statusCode = 401;
        error.message = 'Invalid authentication token';
    }
    
    else if (err.name === 'TokenExpiredError') {
        error.statusCode = 401;
        error.message = 'Session expired. Please log in again';
    }

    // Syntax Error (malformed JSON)
    else if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
        error.statusCode = 400;
        error.message = 'Invalid JSON format in request body';
    }

    // Default fallback
    const statusCode = error.statusCode || err.status || 500;
    const isDev = config.NODE_ENV === 'development';

    const response = {
        success: false,
        error: error.message || 'Internal Server Error',
        ...(isDev && {
            stack: err.stack,
            code: err.code,
            name: err.name,
        }),
    };

    // Don't leak error details in production for 500 errors
    if (statusCode === 500 && !isDev) {
        response.error = 'Something went wrong';
    }

    res.status(statusCode).json(response);
};

module.exports = errorHandler;
