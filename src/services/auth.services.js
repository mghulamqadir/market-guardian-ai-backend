import bcrypt from 'bcryptjs';
import crypto from 'crypto';

import User from '../models/user.model.js';
import Otp from '../models/otp.model.js';

import { ApiError } from '../utils/response.handler.js';
import { generateJwtToken } from '../utils/jwt.token.js';

import {
  sendPasswordResetEmail,
  sendVerificationEmail,
} from '../utils/brevo.utils.js';

import { generateSixDigitCode, normalizeEmail } from '../utils/constant.utils.js';

/**
 * AUTH: Signup
 * - Store original email (trimmed) in `email`
 * - Store normalized lowercase in `emailLower` (via hook or explicitly)
 * - Enforce case-insensitive uniqueness using `emailLower`
 */
export async function signup({ name, email, password, confirmPassword }, file) {
  if (!name || !String(name).trim()) {
    throw ApiError(400, 'Name is required', []);
  }

  if (!email || !String(email).trim()) {
    throw ApiError(400, 'Email is required', []);
  }

  if (!password) {
    throw ApiError(400, 'Password is required', []);
  }

  if (password !== confirmPassword) {
    throw ApiError(400, 'Passwords do not match', []);
  }

  const cleanedEmail = String(email).trim();
  const emailLower = normalizeEmail(cleanedEmail);

  const existingUser = await User.findOne({ where: { emailLower } });
  if (existingUser) {
    throw ApiError(400, 'Email already in use', [
      'Please use a different email or log in.',
    ]);
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  const profilePictureUrl = file?.location || null;

  // Note: hooks in your model should also set emailLower,
  // but we set it explicitly to be safe.
  const newUser = await User.create({
    name: String(name).trim(),
    email: cleanedEmail,
    emailLower,
    password: hashedPassword,
    isVerified: false,
    profilePicture: profilePictureUrl,
  });

  const code = generateSixDigitCode();
  await Otp.create({
    userId: newUser.id,
    email: newUser.email,
    newCode: code,
    purpose: 'signup',
  });

  await sendVerificationEmail(newUser, code);

  return {
    message: 'Signup successful! Verification email has been sent.',
    user: newUser.toJSON(),
  };
}

export async function login({ email, password }) {
  if (!email || !String(email).trim()) {
    throw ApiError(400, 'Email is required', []);
  }

  if (!password) {
    throw ApiError(400, 'Password is required', []);
  }

  const emailLower = normalizeEmail(email);
  console.log('Login attempt for email:', emailLower);

  const user = await User.findOne({ where: { emailLower } });
  console.log('User found:', user ? user.email : 'No user found');

  if (!user) {
    throw ApiError(404, 'Invalid email or password', [
      'No user exists with this email address.',
    ]);
  }

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    throw ApiError(400, 'Invalid email or password', ['Incorrect password.']);
  }

  // Keeping your logic as-is (though usually this increments on failure)
  user.loginAttempts += 1;
  user.lastLoginAttempt = new Date();
  await user.save();

  const response = { user: user.toJSON() };

  if (user.isVerified) {
    response.token = generateJwtToken({ userId: user.id });
    response.message = 'Login successful';
    response.success = true;
  } else {
    response.message = 'Please verify your account';
    response.token = null;
    response.user = null;
    response.success = false;

    const existingOtp = await Otp.findOne({
      where: {
        userId: user.id,
        purpose: 'signup',
      },
    });

    if (existingOtp) {
      await existingOtp.destroy();
    }

    const code = generateSixDigitCode();
    await Otp.create({
      userId: user.id,
      email: user.email,
      newCode: code,
      purpose: 'signup',
    });
    await sendVerificationEmail(userData, code);
  }

  return response;
}

/**
 * AUTH: Forgot Password
 * - Lookup by email
 * - Save hashed reset token in Otp.newCode
 * - Send raw resetToken via email
 */
export async function forgotPassword(email, redirectUrl) {
  if (!email || !String(email).trim()) {
    throw ApiError(400, 'Email is required', []);
  }

  const emailLower = normalizeEmail(email);

  const user = await User.findOne({ where: { emailLower } });
  if (!user) {
    throw ApiError(
      404,
      'This email address is not registered. Please check or sign up.'
    );
  }

  const existingOtp = await Otp.findOne({
    where: { userId: user.id, purpose: 'forgotPassword' },
  });

  if (existingOtp) {
    await existingOtp.destroy();
  }

  const resetToken = crypto.randomBytes(32).toString('hex');
  const hashedToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');

  await Otp.create({
    userId: user.id,
    email: user.email,
    newCode: hashedToken,
    purpose: 'forgotPassword',
  });

  await sendPasswordResetEmail(user, resetToken, redirectUrl);

  return { message: 'Password reset link sent successfully.' };
}

/**
 * AUTH: Reset Password
 * - token comes from email link
 * - hash it and find matching otp record
 * - update password and delete otp
 */
export async function resetPassword(token, newPassword) {
  if (!token) {
    throw ApiError(400, 'Reset token is required', []);
  }

  if (!newPassword) {
    throw ApiError(400, 'New password is required', []);
  }

  const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

  const otp = await Otp.findOne({
    where: { newCode: hashedToken, purpose: 'forgotPassword' },
  });

  if (!otp) {
    throw ApiError(400, 'Invalid or expired reset token', [
      'Please request a new password reset link.',
    ]);
  }

  const user = await User.findByPk(otp.userId);
  if (!user) {
    throw ApiError(404, 'User not found');
  }

  const isSamePassword = await bcrypt.compare(newPassword, user.password);
  if (isSamePassword) {
    throw ApiError(400, 'New password cannot be the same as the old password', [
      'Please choose a different password.',
    ]);
  }

  const hashedPassword = await bcrypt.hash(newPassword, 10);
  await user.update({ password: hashedPassword });

  await otp.destroy();

  return { message: 'Password reset successfully.' };
}

/**
 * AUTH: Verify Email
 * - code is the 6 digit otp
 * - check expiry
 * - verify user and delete otp
 */
export async function verifyEmail(code) {
  if (!code) {
    throw ApiError(400, 'Verification code is required', []);
  }

  const otp = await Otp.findOne({ where: { newCode: code, purpose: 'signup' } });
  if (!otp) {
    throw ApiError(400, 'Invalid or expired verification code', [
      'Please request a new verification code.',
    ]);
  }

  const isExpired = otp.expireAt < new Date();
  if (isExpired) {
    throw ApiError(400, 'Verification code has expired', [
      'Please request a new verification code.',
    ]);
  }

  await User.update({ isVerified: true }, { where: { id: otp.userId } });
  await otp.destroy();

  return { message: 'Email verified successfully.' };
}

/**
 * AUTH: Resend Verification Email
 * - Lookup by emailLower (case-insensitive)
 * - Create OTP and email it (for signup)
 */
export async function resendVerificationEmail(email, purpose) {
  if (!email || !String(email).trim()) {
    throw ApiError(400, 'Email is required', []);
  }

  if (!purpose) {
    throw ApiError(400, 'Purpose is required', []);
  }

  const emailLower = normalizeEmail(email);

  const user = await User.findOne({ where: { emailLower } });
  if (!user) {
    throw ApiError(
      404,
      'This email address is not registered. Please check or sign up.'
    );
  }

  if (purpose === 'signup' && user.isVerified) {
    throw ApiError(400, 'Email already verified', [
      'This email address is already verified.',
    ]);
  }

  const existingOtp = await Otp.findOne({
    where: { userId: user.id, purpose },
  });

  if (existingOtp) {
    await existingOtp.destroy();
  }

  const code = generateSixDigitCode();
  await Otp.create({
    userId: user.id,
    email: user.email,
    newCode: code,
    purpose,
  });

  if (purpose === 'signup') {
    await sendVerificationEmail(user, code);
  } else if (purpose === 'forgotPassword') {
    // ⚠️ your original code sends reset email with "code" directly,
    // but your forgotPassword flow uses a link token approach.
    // Keeping your original behavior; but consider removing this branch.
    await sendPasswordResetEmail(user, code);
  }

  return { message: 'Verification email sent successfully.' };
}
