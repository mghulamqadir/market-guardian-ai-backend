import express from 'express';
import userController from '../controllers/user.controllers.js';
import { authenticateToken } from '../middlewares/token.middleware.js';
import {
  UserPasswordValidator,
  UserProfileValidator,
} from '../middlewares/user.middleware.js';

const router = express.Router();

router.patch(
  '/update-password',
  authenticateToken,
  UserPasswordValidator,
  userController.updatePassword,
);
router.patch(
  '/update-profile',
  authenticateToken,
  UserProfileValidator,
  userController.updateProfile,
);
router.get('/me', authenticateToken, userController.getProfile);
router.post('/contact-us', UserProfileValidator, userController.contactUs);

export default router;
