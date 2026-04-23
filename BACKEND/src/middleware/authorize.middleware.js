// it checks if user's role is inside the allowed role list 
const authorize = (...allowedRoles) => {
    return (req, res, next) => {
        try {
            // Ensure user exists
            if (!req.user) {
                return res.status(401).json({
                    success: false,
                    message: "Not authenticated"
                });
            }

            // Check if role is allowed
            if (!allowedRoles.includes(req.user.role)) {
                return res.status(403).json({
                    success: false,
                    message: `Access denied. Role '${req.user.role}' is not permitted`,
                });
            }

            next();
        } catch (error) {
            next(error);
        }
    };
};

module.exports = authorize;