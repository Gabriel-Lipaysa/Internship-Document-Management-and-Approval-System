const jwt = require('jsonwebtoken');
const config = require('../config/config');
const { User } = require('../models');

function auth(roles) {
    return async (req, res, next) => {
        const isApiOrFetch = req.xhr ||
            req.path.startsWith('/api/') ||
            req.headers['accept']?.includes('application/json') ||
            req.headers['content-type']?.includes('multipart/form-data') ||
            req.headers['content-type']?.includes('application/json') ||
            req.method === 'POST' ||
            req.method === 'PUT' ||
            req.method === 'DELETE';

        try {
            const authHeader = req.headers.authorization;
            const token = (authHeader && authHeader.startsWith('Bearer '))
                ? authHeader.split(' ')[1]
                : req.cookies?.token;

            if (!token) {
                if (isApiOrFetch) {
                    return res.status(401).json({
                        error: '401 Unauthorized: No authentication token found. Please log in or refresh your session.'
                    });
                }
                return res.redirect('/?error=Please login first');
            }

            let decoded;
            try {
                decoded = jwt.verify(token, config.JWT_SECRET);
            } catch (jwtErr) {
                if (isApiOrFetch) {
                    return res.status(401).json({
                        error: `401 Unauthorized: Session token is invalid or has expired (${jwtErr.message}). Please log in again.`
                    });
                }
                return res.redirect('/?error=Session expired');
            }

            const user = await User.findById(decoded.userId).populate('studentProfile');

            if (!user) {
                if (isApiOrFetch) {
                    return res.status(404).json({ error: '404 Not Found: Authenticated user account was not found in database.' });
                }
                return res.redirect('/?error=User not found');
            }

            req.user = user;
            res.locals.user = user;

            const allowedRoles = Array.isArray(roles) ? roles : (roles ? [roles] : []);

            if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
                if (isApiOrFetch) {
                    return res.status(403).json({
                        error: `403 Forbidden: User role '${user.role}' is not authorized to access this resource. Allowed roles: [${allowedRoles.join(', ')}]`
                    });
                }
                return res.redirect('/?error=Access denied');
            }

            next();
        } catch (err) {
            console.error('Auth Middleware Exception:', err);
            if (isApiOrFetch) {
                return res.status(500).json({ error: `500 Authentication Error: ${err.message}` });
            }
            res.redirect('/?error=Session expired');
        }
    };
}

module.exports = auth;
