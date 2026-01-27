import { errorResponse, ApiError } from '../utils/response.handler.js';
import { Roles, RolesEnum } from '../utils/constant.utils.js';

const authorizeRoles = (...allowedRoles) => {
  return (req, res, next) => {
    try {
      if (!req.user) {
        return errorResponse(
          res,
          new ApiError(401, 'Unauthorized. Please log in.'),
        );
      }

      // Validate that requested roles are within our defined roles
      if (!allowedRoles.every((role) => RolesEnum.includes(role))) {
        return errorResponse(
          res,
          new ApiError(400, 'Invalid role specified in middleware.'),
        );
      }

      // Check if the user's role is allowed
      if (!allowedRoles.includes(req.user.role)) {
        return errorResponse(
          res,
          new ApiError(
            403,
            `Forbidden. Only ${allowedRoles.map((role) => Object.keys(Roles).find((key) => Roles[key] === role)).join(', ')} can access this resource.`,
          ),
        );
      }

      // Proceed if role is allowed
      next();
    } catch (error) {
      console.error('Role Authorization Error:', error.message);

      return errorResponse(
        res,
        new ApiError(400, 'Invalid role specified in middleware.'),
      );
    }
  };
};

export { authorizeRoles };
