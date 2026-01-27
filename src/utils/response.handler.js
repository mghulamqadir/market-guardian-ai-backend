import multer from 'multer';
export function ApiError(
  statusCode = 400,
  message = 'Something went wrong',
  errors = [],
  stack,
) {
  const error = new Error(message);
  error.name = 'ApiError';
  error.statusCode = statusCode;
  error.success = false;
  error.data = null;
  error.errors = Array.isArray(errors) ? errors : [errors];

  // Maintain proper stack trace for where our error was thrown
  if (stack) {
    error.stack = stack;
  } else {
    Error.captureStackTrace(error, ApiError);
  }

  return error;
}

export function successResponse(
  res,
  statusCode = 200,
  message = 'Operation successful',
  data = null,
) {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
    errors: [],
  });
}

export function errorResponse(res, error) {
  const statusCode = error && error.statusCode ? error.statusCode : 400;
  const message = error && error.message ? error.message : 'An Error occure';
  const errors = error && error.errors ? error.errors : [];

  return res.status(statusCode).json({
    success: false,
    message,
    data: null,
    errors,
  });
}

export const errorHandler = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    // Handle multer-specific errors
    res.status(400).json({ error: err.message });
  } else if (err.statusCode) {
    // Handle custom errors with statusCode
    res.status(err.statusCode).json({ error: err.message });
  } else {
    // Generic error handler
    res.status(400).json({ error: 'An unexpected error occurred' });
  }
  next();
};
