import { errorResponse, ApiError } from '../utils/response.handler.js';
import Joi from 'joi';

const validateRequest = (schema) => (req, res, next) => {
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

// **user profile Conditional Joi Validation Schema**
const updateUserProfile = Joi.object({
  description: Joi.string().max(500).optional().messages({
    'string.max': 'Description must be 500 characters or fewer.',
  }),
  status: Joi.string().valid('active', 'inactive').optional().messages({
    'any.only': 'Status must be active or inactive.',
  }),
  name: Joi.string().max(50).optional().messages({
    'string.max': 'Name must be 50 characters or fewer.',
  }),
});

const updateUserPassword = Joi.object({
  oldPassword: Joi.string().required().min(8).messages({
    'string.min': 'Current password must be at least 8 characters.',
    'any.required': 'Old password is required when updating the password.',
  }),
  newPassword: Joi.string()
    .min(8)
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_])[^\s]+$/)
    .custom((value, helpers) => {
      const oldPassword = helpers.state.ancestors[0]?.oldPassword;
      if (value === oldPassword) {
        return helpers.error('any.custom', {
          message: 'New password must be different from the current password.',
        });
      }
      return value;
    })
    .messages({
      'string.min': 'Password must be at least 8 characters.',
      'string.pattern.base':
        'Password must contain at least 1 number, 1 lowercase letter, 1 uppercase letter, 1 special character, and no spaces.',
      'any.custom': '{{#message}}',
    }),
});

export const UserPasswordValidator = validateRequest(updateUserPassword);
export const UserProfileValidator = validateRequest(updateUserProfile);
