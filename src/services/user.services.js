import bcrypt from 'bcryptjs';
import User from '../models/user.model.js';
import { ApiError } from '../utils/response.handler.js';
import { sendContactUsEmail } from '../utils/brevo.utils.js';
import { Op } from 'sequelize';

export async function getProfile(userId) {
  const user = await User.findByPk(userId);
  if (!user) {
    throw ApiError(404, 'User not found', ['No user exists with this ID.']);
  }

  return user.toJSON();
}

export async function getAllUsers(options = {}) {
  // Set up pagination, filtering, and sorting defaults
  const page = Math.max(parseInt(options.page, 10) || 1, 1);
  const limit = Math.max(parseInt(options.limit, 10) || 10, 1);
  const sort = options.sort || 'createdAt';
  const order = options.order === 'asc' ? 'ASC' : 'DESC';

  // Calculate the number of documents to skip for pagination
  const offset = (page - 1) * limit;

  // Apply pagination, filtering, and sorting
  const { count: total, rows: users } = await User.findAndCountAll({
    offset,
    limit,
    order: [[sort, order]],
  });

  // Calculate total pages
  const totalPages = Math.ceil(total / limit);

  return {
    users,
    total,
    page,
    limit,
    totalPages,
  };
}

export async function updatePassword(userId, oldPassword, newPassword) {
  const user = await User.findByPk(userId);
  if (!user) {
    throw ApiError(404, 'User not found', ['No user exists with this ID.']);
  }

  const isMatch = await bcrypt.compare(oldPassword, user.password);
  if (!isMatch) {
    throw ApiError(400, 'Incorrect old password', [
      'Old password is incorrect.',
    ]);
  }

  const hashedPassword = await bcrypt.hash(newPassword, 10);
  await user.update({ password: hashedPassword });
}

export async function updateProfile(userId, updateData) {
  const user = await User.findByPk(userId);
  if (!user) {
    throw ApiError(404, 'User not found', ['No user exists with this ID.']);
  }

  await user.update(updateData);

  return user.toJSON();
}

export async function contactUs(username, email, description) {
  if (!username || !email || !description) {
    throw ApiError(400, 'All fields are required', [
      'Username, email, and message must be provided.',
    ]);
  }

  await sendContactUsEmail(username, email, description);
  return { message: 'Your message has been sent successfully!' };
}
