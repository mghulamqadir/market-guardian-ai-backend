import bcrypt from 'bcryptjs';
import User from '../models/user.model.js';
import { ApiError } from '../utils/response.handler.js';
import { generateJwtToken } from '../utils/jwt.token.js';
import Otp from '../models/otp.model.js';
import {
  sendPasswordResetEmail,
  sendVerificationEmail,
} from '../utils/brevo.utils.js';
import { generateSixDigitCode } from '../utils/constant.utils.js';
import crypto from 'crypto';

export async function signup({ name, email, password, confirmPassword }, file) {
  if (password !== confirmPassword) {
    throw ApiError(400, 'Passwords do not match', []);
  }

  const existingUser = await User.findOne({ where: { email } });
  if (existingUser) {
    throw ApiError(400, 'Email already in use', [
      'Please use a different email or log in.',
    ]);
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  const profilePictureUrl = file?.location || null;

  const newUser = await User.create({
    name,
    email,
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

  const userData = newUser.toJSON();

  return {
    message: 'Signup successful! Verification email has been sent.',
    user: userData,
  };
}

export async function login({ email, password }) {
  const user = await User.findOne({ where: { email } });
  if (!user) {
    throw ApiError(404, 'Invalid email or password', [
      'No user exists with this email address.',
    ]);
  }

  const isMatch = await bcrypt.compare(password, user.password);

  if (!isMatch) {
    throw ApiError(400, 'Invalid email or password', ['Incorrect password.']);
  }

  user.loginAttempts += 1;
  user.lastLoginAttempt = new Date();
  await user.save();

  const userData = user.toJSON();
  const response = { user: userData };

  if (user.isVerified) {
    const token = generateJwtToken({ userId: user.id });
    response.token = token;
    response.message = 'Login successful';
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
    // await sendVerificationEmail(userData, code);
  }
  return response;
}

export async function forgotPassword(email, redirectUrl) {
  const user = await User.findOne({ where: { email } });
  if (!user) {
    throw ApiError(
      404,
      'This email address is not registered. Please check or sign up.'
    );
  }

  const existingOtp = await Otp.findOne({
    where: {
      userId: user.id,
      purpose: 'forgotPassword',
    },
  });

  if (existingOtp) {
    await existingOtp.destroy();
  }

  const resetToken = crypto.randomBytes(32).toString('hex');
  const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');

  await Otp.create({
    userId: user.id,
    email: user.email,
    newCode: hashedToken,
    purpose: 'forgotPassword',
  });

  await sendPasswordResetEmail(user, resetToken, redirectUrl);

  return { message: 'Password reset Link sent successfully.' };
}

export async function resetPassword(token, newPassword) {
  const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

  const otp = await Otp.findOne({
    where: {
      newCode: hashedToken,
      purpose: 'forgotPassword',
    },
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

export async function verifyEmail(code) {
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

  await User.update(
    { isVerified: true },
    { where: { id: otp.userId } }
  );

  await otp.destroy();
}

export async function resendVerificationEmail(email, purpose) {
  const user = await User.findOne({ where: { email } });
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
    where: {
      userId: user.id,
      purpose,
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
    purpose,
  });

  if (purpose === 'signup') {
    await sendVerificationEmail(user, code);
  }

  if (purpose === 'forgotPassword') {
    await sendPasswordResetEmail(user, code);
  }

  return { message: 'Verification email sent successfully.' };
}
