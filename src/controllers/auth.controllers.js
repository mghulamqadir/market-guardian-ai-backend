import {
  successResponse,
  errorResponse,
} from '../utils/response.handler.js';
import * as authService from '../services/auth.services.js';

export async function signup(req, res) {
  try {
    const { message } = await authService.signup(req.body, req.file);
    return successResponse(res, 201, message);
  } catch (error) {
    return errorResponse(res, error);
  }
}

export async function login(req, res) {
  try {
    const { token, user, message } = await authService.login(req.body);
    return successResponse(res, 200, message, { user, token });
  } catch (error) {
    return errorResponse(res, error);
  }
}

export async function forgotPassword(req, res) {
  try {
    const { email, redirectUrl } = req.body;
    await authService.forgotPassword(email, redirectUrl);
    return successResponse(res, 200, 'A reset code was sent to your email.');
  } catch (error) {
    return errorResponse(res, error);
  }
}

export async function resetPassword(req, res) {
  try {
    const { code, newPassword } = req.body;
    await authService.resetPassword(code, newPassword);
    return successResponse(
      res,
      200,
      'Your password has been reset. Please log in with your new credentials.',
    );
  } catch (error) {
    return errorResponse(res, error);
  }
}

export async function verifyEmail(req, res) {
  try {
    const { code } = req.body;
    await authService.verifyEmail(code);
    return successResponse(res, 200, 'Email verified successfully.');
  } catch (error) {
    return errorResponse(res, error);
  }
}

export async function resendVerificationEmail(req, res) {
  try {
    const { email, purpose } = req.body;
    await authService.resendVerificationEmail(email, purpose);
    return successResponse(res, 200, 'Verification email sent successfully.');
  } catch (error) {
    return errorResponse(res, error);
  }
}
