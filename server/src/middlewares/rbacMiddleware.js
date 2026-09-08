import { ROLE_PERMISSIONS } from '../config/permissions.js';

export const requirePermission = (requiredPermission) => {
  return (req, res, next) => {
    if (!req.user || !req.user.role) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const userPermissions = ROLE_PERMISSIONS[req.user.role] || [];

    if (!userPermissions.includes(requiredPermission)) {
      return res.status(403).json({ message: "You do not have permission to perform this action" });
    }

    next();
  };
};
