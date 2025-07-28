const jwt = require('jsonwebtoken');
const User = require('../models/user');

const authMiddleware = async (req, res, next) => {
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
        return res.status(401).json({ message: 'Access denied. No token provided.' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const userId = decoded.id || decoded._id;
        if (!userId) {
            console.log('DEBUG AUTH: Invalid token, missing user id:', decoded);
            return res.status(401).json({ message: 'Invalid token: missing user id.' });
        }
        // Fetch full user object
        const user = await User.findById(userId);
        if (!user) {
            console.log('DEBUG AUTH: User not found for userId:', userId);
            return res.status(401).json({ message: 'User not found.' });
        }
        req.user = user;
        req.user._id = user._id?.toString();
        req.user.buyerId = user.buyerId || undefined; // Ensure buyerId is set
        console.log('DEBUG AUTH req.user:', req.user); // Debug log
        next();
    } catch (error) {
        console.log('DEBUG AUTH: Invalid token error:', error);
        res.status(400).json({ message: 'Invalid token.' });
    }
};

const adminOnly = (req, res, next) => {
    if (!req.user || req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Admin access required.' });
    }
    next();
};

// Restrict subadmin access to /admin routes until approved (active: true)
const restrictUnapprovedSubadmin = (req, res, next) => {
    console.log('DEBUG restrictUnapprovedSubadmin:', req.user);
    if (req.user && req.user.role === 'subadmin' && (!req.user.active || !req.user.approved)) {
        return res.status(403).json({ message: 'Access denied. Subadmin not approved by admin yet.' });
    }
    next();
};

const requireSubadmin = (req, res, next) => {
    if (req.user && req.user.role === 'subadmin' && req.user.approved === true && req.user.active === true) return next();
    return res.status(403).json({ message: 'Subadmin access only for approved and active subadmins.' });
};

module.exports = authMiddleware;
module.exports.adminOnly = adminOnly;
module.exports.requireSubadmin = requireSubadmin;
module.exports.restrictUnapprovedSubadmin = restrictUnapprovedSubadmin;