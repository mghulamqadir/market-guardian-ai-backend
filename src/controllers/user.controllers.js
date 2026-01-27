import * as userService from '../services/user.services.js';
import { successResponse, errorResponse } from '../utils/response.handler.js';

export async function getProfile(req, res) {
  try {
    const userId = req.user.id;
    const userProfile = await userService.getProfile(userId);
    return successResponse(
      res,
      200,
      'User profile retrieved successfully!',
      userProfile,
    );
  } catch (error) {
    return errorResponse(res, error);
  }
}

export async function updateProfile(req, res) {
  try {
    const userId = req.user.id;
    const updatedUser = await userService.updateProfile(userId, req.body);
    return successResponse(
      res,
      200,
      'Profile updated successfully!',
      updatedUser,
    );
  } catch (error) {
    return errorResponse(res, error);
  }
}

export async function updatePassword(req, res) {
  try {
    const userId = req.user.id;
    const { oldPassword, newPassword } = req.body;
    await userService.updatePassword(userId, oldPassword, newPassword);
    return successResponse(res, 200, 'Password updated successfully!');
  } catch (error) {
    return errorResponse(res, error);
  }
}

export async function contactUs(req, res) {
  try {
    const { username, email, description } = req.body;
    const response = await userService.contactUs(username, email, description);
    return successResponse(
      res,
      200,
      'Your message has been sent successfully!',
      response,
    );
  } catch (error) {
    return errorResponse(res, error);
  }
}

export default {
  updatePassword,
  updateProfile,
  getProfile,
  contactUs,
};
