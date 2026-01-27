import express from 'express';
import * as authControllers from '../controllers/auth.controllers.js';

import {
  signupValidator,
  loginValidator,
  resetPasswordValidator,
  resendEmailValidator,
} from '../middlewares/auth.middleware.js';
import { processAndUploadImage, upload } from '../middlewares/multer.middleware.js';

const router = express.Router();

router.post(
  '/signup',
  upload.single('profilePicture'),
  processAndUploadImage,
  signupValidator,
  authControllers.signup
);

router.post('/verify-email', authControllers.verifyEmail);

router.post(
  '/resend-email',
  resendEmailValidator,
  authControllers.resendVerificationEmail,
);

router.post('/login', loginValidator, authControllers.login);

router.post('/forgot-password', authControllers.forgotPassword);

router.post(
  '/reset-password',
  resetPasswordValidator,
  authControllers.resetPassword,
);

export default router;
