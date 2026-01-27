import jwt from 'jsonwebtoken';
import User from '../models/user.model.js';
import { errorResponse, ApiError } from '../utils/response.handler.js';
const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return errorResponse(
      res,
      new ApiError(401, 'Access denied. No token provided.'),
    );
  }
  try {
    const isVerified = jwt.verify(token, `${process.env.JWT_SECRET_KEY}`);

    if (!isVerified) {
      return errorResponse(res, new ApiError(401, 'Invalid Token.'));
    }
    const user = await User.findByPk(isVerified.userId);

    if (!user) {
      return errorResponse(res, new ApiError(404, 'User Not Found'));
    }
    req.user = user;
    next();
  } catch (err) {
    console.error(err);
    return errorResponse(res, new ApiError(401, 'Invalid Token.'));
  }
};

export { authenticateToken };
