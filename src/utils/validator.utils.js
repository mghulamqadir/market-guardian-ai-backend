import { ApiError, errorResponse } from './response.handler.js';

export const validateRequest = (schema) => (req, res, next) => {
  const { error, value } = schema.validate(req.body, { abortEarly: false });
  if (error) {
    // Map over all error details to collect messages.
    const messages = error.details.map((detail) => detail.message);
    return errorResponse(res, ApiError(400, messages));
  }
  // Overwrite req.body with the validated & sanitized values.
  req.body = value;
  next();
};

export const validateQuery = (schema) => (req, res, next) => {
  const { error, value } = schema.validate(req.query, { abortEarly: false });
  if (error) {
    // Map over all error details to collect messages.
    const messages = error.details.map((detail) => detail.message);
    return errorResponse(res, ApiError(400, messages));
  }
  // Overwrite req.query with the validated & sanitized values.
  req.query = value;
  next();
};

export const validateParams = (schema) => (req, res, next) => {
  const { error, value } = schema.validate(req.params, { abortEarly: false });
  if (error) {
    // Map over all error details to collect messages.
    const messages = error.details.map((detail) => detail.message);
    return errorResponse(res, ApiError(400, messages));
  }
  // Overwrite req.params with the validated & sanitized values.
  req.params = value;
  next();
};
