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

const passwordRegex = /^(?!^\s)(?!\s$)(?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?=.*[ !@#$%^&*(),.?":{}|<>_\-])[A-Za-z\d !@#$%^&*(),.?":{}|<>_\-]{8,}$/;
const emailRegex = /^(?!\s)([+\w-]+(?:\.[+\w-]+)*)@((?:[\w-]+\.)*\w[\w-]{0,66})\.([a-zA-Z]{2,6}(?:\.[a-zA-Z]{2})?)$/;
const signupSchema = Joi.object({
  name: Joi.string().min(3).required().messages({
    'string.min':
      'Invalid name. Must be at least 3 characters and contain no spaces.',
    'string.pattern.base':
      'Invalid name. Must be at least 3 characters and contain no spaces.',
    'any.required': 'Name is required.',
  }),
  email: Joi.string()
    .email({ tlds: { allow: ['com', 'net'] } })
    .regex(emailRegex)
    .required()
    .custom((value) => value.toLowerCase())
    .messages({
      'string.email': 'Invalid email format.',
      'any.required': 'Email is required.',
    }),
  password: Joi.string()
    .min(8)
    .regex(passwordRegex)
    .required()
    .messages({
      'string.min': 'Password must be at least 8 characters.',
      'string.pattern.base':
        'Password must contain 1 number, 1 lowercase letter, 1 uppercase letter, 1 special character, and no spaces are allwoed at the start or end.',
      'any.required': 'Password is required.',
    }),
  confirmPassword: Joi.string().required().valid(Joi.ref('password')).messages({
    'any.required': 'Confirm password is required.',
    'any.only': 'Confirm password does not match password.',
  }),
});

const loginSchema = Joi.object({
  email: Joi.string()
    .email()
    .required()
    .custom((value) => value.toLowerCase())
    .messages({ 'any.required': 'Email is required.' }),
  password: Joi.string()
    .required()
    .messages({ 'any.required': 'Password is required.' }),
});

const resetPasswordSchema = Joi.object({
  code: Joi.string().min(3).required().messages({
    'string.min': 'Invalid code.',
    'any.required': 'Code is required.',
  }),
  newPassword: Joi.string()
    .min(8)
    .regex(passwordRegex)
    .required()
    .messages({
      'string.min': 'Password must be at least 8 characters.',
      'string.pattern.base':
        'Password must contain 1 number, 1 lowercase letter, and 1 uppercase letter and 1 special character and no spaces at the start or end.',
      'any.required': 'newPassword is required.',
    }),
});

const resendEmailSchema = Joi.object({
  email: Joi.string()
    .email()
    .required()
    .custom((value) => value.toLowerCase())
    .messages({ 'any.required': 'Email is required.' }),
  purpose: Joi.string().valid('signup', 'forgotPassword').required().messages({
    'any.only': 'Purpose must be either signup or forgotPassword.',
    'any.required': 'Purpose is required.',
  }),
});

export const resendEmailValidator = validateRequest(resendEmailSchema);
export const signupValidator = validateRequest(signupSchema);
export const loginValidator = validateRequest(loginSchema);
export const resetPasswordValidator = validateRequest(resetPasswordSchema);
