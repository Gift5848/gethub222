const User = require('../models/user');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const ShopRequest = require('../models/shopRequest');
const { createWalletForShop } = require('./walletController');

// Register a new user (with optional role)
exports.register = async (req, res) => {
    const { username, email, password, role, phone } = req.body;
    if (!username || !email || !password || !phone) {
        return res.status(400).json({ message: 'All fields are required.' });
    }
    // Only block subadmin/seller creation from this endpoint
    if (role === 'subadmin' || role === 'seller') {
        return res.status(403).json({ message: 'Subadmins and sellers can only be created by admin or subadmin.' });
    }
    try {
        const existingUser = await User.findOne({ $or: [{ email }, { username }] });
        if (existingUser) {
            let field = existingUser.username === username ? 'Username' : 'Email';
            return res.status(400).json({ message: `${field} already exists.` });
        }
        const hashedPassword = await bcrypt.hash(password, 10);
        // Save phone for all users
        const newUser = new User({ username, email, password: hashedPassword, role: 'user', phone });
        await newUser.save();
        res.status(201).json({ message: 'User registered successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message || 'Error registering user', error });
    }
};

// Login a user
exports.login = async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
        return res.status(400).json({ message: 'Email and password are required.' });
    }
    try {
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        // Debug: log user status and role
        console.log('LOGIN ATTEMPT:', { email, role: user.role, approved: user.approved, active: user.active });
        // Block subadmin login if not approved or not active
        if (user.role === 'subadmin' && (!user.active || !user.approved)) {
            return res.status(403).json({ message: 'Your account is under review. Please wait for admin approval.' });
        }
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }
        // Add shopId to JWT payload if present
        const payload = { id: user._id, role: user.role };
        if (user.shopId) payload.shopId = user.shopId;
        const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h' });
        // Return full user object for frontend localStorage
        res.status(200).json({
            token,
            user: {
                _id: user._id,
                email: user.email,
                role: user.role,
                shopId: user.shopId,
                buyerId: user.buyerId
            }
        });
    } catch (error) {
        res.status(500).json({ message: error.message || 'Error logging in', error });
    }
};

// List all users (admin only)
exports.listUsers = async (req, res) => {
    try {
        // Populate owner (username) and shopId (shopName) for each user
        const users = await User.find({}, '-password')
            .populate({ path: 'owner', select: 'username' })
            .populate({ path: 'shopId', select: 'shopName' });
        res.json(users);
    } catch (error) {
        res.status(500).json({ message: error.message || 'Error fetching users', error });
    }
};

// Delete a user (admin only)
exports.deleteUser = async (req, res) => {
    try {
        await User.findByIdAndDelete(req.params.id);
        res.json({ message: 'User deleted' });
    } catch (error) {
        res.status(500).json({ message: error.message || 'Error deleting user', error });
    }
};

// Create a sub-admin (admin only)
exports.createSubAdmin = async (req, res) => {
    const { username, email, password } = req.body;
    if (!username || !email || !password) {
        return res.status(400).json({ message: 'All fields are required.' });
    }
    try {
        const existingUser = await User.findOne({ $or: [{ email }, { username }] });
        if (existingUser) {
            let field = existingUser.username === username ? 'Username' : 'Email';
            return res.status(400).json({ message: `${field} already exists.` });
        }
        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = new User({ username, email, password: hashedPassword, role: 'subadmin' });
        await newUser.save();
        res.status(201).json({ message: 'Sub-admin created successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message || 'Error creating sub-admin', error });
    }
};

// Update a user (admin only)
exports.updateUser = async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) return res.status(404).json({ message: 'User not found' });
        // Only allow username/email update for now
        user.username = req.body.username || user.username;
        user.email = req.body.email || user.email;
        await user.save();
        res.json({ message: 'User updated', user });
    } catch (error) {
        res.status(500).json({ message: error.message || 'Error updating user', error });
    }
};

// Helper: Generate unique sellerId for a shop
async function generateSellerId(shopId) {
    // Find all sellers in this shop
    const sellers = await User.find({ shopId, role: 'seller' }, 'sellerId');
    let max = 0;
    // Match sellerId in format: <shopId>-seN
    sellers.forEach(s => {
        const regex = new RegExp(`^${shopId}-se(\\d+)$`);
        const match = regex.exec(s.sellerId);
        if (match) max = Math.max(max, parseInt(match[1], 10));
    });
    return `${shopId}-se${max + 1}`;
}

// List sellers for subadmin (only their own sellers in their shop)
exports.listSellersForSubadmin = async (req, res) => {
    try {
        if (req.user.role !== 'subadmin' || !req.user.active || !req.user.approved) return res.status(403).json({ message: 'Forbidden' });
        const subadmin = await User.findById(req.user.id);
        const sellers = await User.find({ owner: req.user.id, role: 'seller', shopId: subadmin.shopId }, '-password');
        res.json(sellers);
    } catch (error) {
        res.status(500).json({ message: error.message || 'Error fetching sellers', error });
    }
};

// Helper: Enforce subadmin cannot grant privileges they do not have
function filterSellerPrivileges(subadminPrivileges, requestedPrivileges) {
    const allowed = {};
    for (const key of Object.keys(requestedPrivileges || {})) {
        // Only allow privilege if subadmin has it
        if (subadminPrivileges && subadminPrivileges[key] === true) {
            allowed[key] = requestedPrivileges[key];
        } else {
            allowed[key] = false;
        }
    }
    return allowed;
}

// Create seller for subadmin (sets owner and privileges, enforces shopId and unique sellerId)
exports.createSellerForSubadmin = async (req, res) => {
    try {
        if (req.user.role !== 'subadmin' || !req.user.active || !req.user.approved) return res.status(403).json({ message: 'Forbidden' });
        const { username, email, password, privileges, role } = req.body;
        if (!username || !email || !password) {
            return res.status(400).json({ message: 'All fields are required.' });
        }
        // Prevent subadmin from setting any role other than 'seller'
        if (role && role !== 'seller') {
            return res.status(403).json({ message: 'Subadmin can only create sellers.' });
        }
        // Allow same email in different shops (per-shop uniqueness)
        const subadmin = await User.findById(req.user.id);
        const shopId = subadmin.shopId;
        const existingUser = await User.findOne({ email, shopId, role: 'seller' });
        if (existingUser) {
            return res.status(400).json({ message: 'Email already exists for this shop.' });
        }
        let filteredPrivileges = privileges;
        if (subadmin && subadmin.privileges) {
            filteredPrivileges = filterSellerPrivileges(subadmin.privileges, privileges || {});
        }
        // Assign shopId and unique sellerId
        const sellerId = await generateSellerId(shopId);
        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = new User({ username, email, password: hashedPassword, role: 'seller', owner: req.user.id, privileges: filteredPrivileges, shopId, sellerId });
        await newUser.save();
        // Create wallet for this seller's shop if not exists
        await createWalletForShop(shopId);
        res.status(201).json({ message: 'Seller created successfully', user: newUser });
    } catch (error) {
        // Handle duplicate key error for unique index
        if (error.code === 11000) {
            const field = Object.keys(error.keyValue)[0];
            return res.status(400).json({ message: `${field.charAt(0).toUpperCase() + field.slice(1)} already exists.` });
        }
        res.status(500).json({ message: error.message || 'Error creating seller', error });
    }
};

// Update seller for subadmin (update privileges, enforce shopId)
exports.updateSellerForSubadmin = async (req, res) => {
    try {
        if (req.user.role !== 'subadmin' || !req.user.active || !req.user.approved) return res.status(403).json({ message: 'Forbidden' });
        const subadmin = await User.findById(req.user.id);
        const user = await User.findOne({ _id: req.params.id, owner: req.user.id, role: 'seller', shopId: subadmin.shopId });
        if (!user) return res.status(404).json({ message: 'Seller not found' });
        user.username = req.body.username || user.username;
        user.email = req.body.email || user.email;
        if (req.body.privileges) {
            // Enforce privilege inheritance
            let filteredPrivileges = req.body.privileges;
            if (subadmin && subadmin.privileges) {
                filteredPrivileges = filterSellerPrivileges(subadmin.privileges, req.body.privileges || {});
            }
            user.privileges = filteredPrivileges;
        }
        await user.save();
        res.json({ message: 'Seller updated', user });
    } catch (error) {
        res.status(500).json({ message: error.message || 'Error updating seller', error });
    }
};

// Delete seller for subadmin (only their own in their shop)
exports.deleteSellerForSubadmin = async (req, res) => {
    try {
        if (req.user.role !== 'subadmin' || !req.user.active || !req.user.approved) return res.status(403).json({ message: 'Forbidden' });
        const subadmin = await User.findById(req.user.id);
        const user = await User.findOneAndDelete({ _id: req.params.id, owner: req.user.id, role: 'seller', shopId: subadmin.shopId });
        if (!user) return res.status(404).json({ message: 'Seller not found' });
        res.json({ message: 'Seller deleted' });
    } catch (error) {
        res.status(500).json({ message: error.message || 'Error deleting seller', error });
    }
};

// Reset seller password for subadmin (only their own in their shop)
exports.resetSellerPasswordForSubadmin = async (req, res) => {
    try {
        if (req.user.role !== 'subadmin' || !req.user.active || !req.user.approved) return res.status(403).json({ message: 'Forbidden' });
        const subadmin = await User.findById(req.user.id);
        const user = await User.findOne({ _id: req.params.id, owner: req.user.id, role: 'seller', shopId: subadmin.shopId });
        if (!user) return res.status(404).json({ message: 'Seller not found' });
        // Generate new password
        const newPassword = Math.random().toString(36).slice(-8);
        user.password = await bcrypt.hash(newPassword, 10);
        await user.save();
        // TODO: Send new password to seller's email (implement email sending here)
        res.json({ message: 'Password reset! New password sent to seller email.' });
    } catch (error) {
        res.status(500).json({ message: error.message || 'Error resetting password', error });
    }
};

// Toggle seller status (active/inactive) for subadmin (only their own)
exports.toggleSellerStatusForSubadmin = async (req, res) => {
    try {
        if (req.user.role !== 'subadmin' || !req.user.active || !req.user.approved) return res.status(403).json({ message: 'Forbidden' });
        const user = await User.findOne({ _id: req.params.id, owner: req.user.id, role: 'seller' });
        if (!user) return res.status(404).json({ message: 'Seller not found' });
        user.active = !user.active;
        await user.save();
        res.json({ message: 'Seller status updated', active: user.active });
    } catch (error) {
        res.status(500).json({ message: error.message || 'Error updating status', error });
    }
};

// Forgot Password
exports.forgotPassword = async (req, res) => {
    const { email } = req.body;
    if (!email) {
        return res.status(400).json({ message: 'Email is required.' });
    }
    try {
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).json({ message: 'No user found with that email.' });
        }
        // Generate token
        const token = crypto.randomBytes(32).toString('hex');
        user.resetPasswordToken = token;
        user.resetPasswordExpires = Date.now() + 3600000; // 1 hour
        await user.save();
        // For demo: log reset link (replace with email logic in production)
        const resetLink = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password/${token}`;
        console.log(`Password reset link for ${email}: ${resetLink}`);
        res.status(200).json({ message: 'Password reset link sent to email (check console in dev).' });
    } catch (error) {
        res.status(500).json({ message: error.message || 'Error processing forgot password', error });
    }
};

// Reset Password using token
exports.resetPassword = async (req, res) => {
    const { token, password } = req.body;
    if (!token || !password) {
        return res.status(400).json({ message: 'Token and new password are required.' });
    }
    try {
        const user = await User.findOne({
            resetPasswordToken: token,
            resetPasswordExpires: { $gt: Date.now() }
        });
        if (!user) {
            return res.status(400).json({ message: 'Invalid or expired token.' });
        }
        const bcrypt = require('bcryptjs');
        user.password = await bcrypt.hash(password, 10);
        user.resetPasswordToken = undefined;
        user.resetPasswordExpires = undefined;
        await user.save();
        res.status(200).json({ message: 'Password has been reset successfully.' });
    } catch (error) {
        res.status(500).json({ message: error.message || 'Error resetting password', error });
    }
};

// Register a new shop (subadmin) - requires admin approval
exports.registerShop = async (req, res) => {
    const { shopName, tin, location, address, owner, email, phone, password } = req.body;
    // License certificate file
    const licenseCertificate = req.file ? `/uploads/licenses/${req.file.filename}` : null;
    if (!shopName || !owner || !email || !password || !licenseCertificate) {
        return res.status(400).json({ message: 'Missing required fields or license certificate.' });
    }
    try {
        // Check for existing user or shop request
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: 'Email already in use.' });
        }
        const existingRequest = await ShopRequest.findOne({ email, status: 'pending' });
        if (existingRequest) {
            return res.status(400).json({ message: 'A shop registration request is already pending for this email.' });
        }
        // Create shop request first (so we have its _id)
        const shopRequest = new ShopRequest({
            shopName, licenseCertificate, tin, location, address, owner, email, phone, status: 'pending'
        });
        await shopRequest.save();
        console.log('ShopRequest created in collection:', shopRequest.collection.collectionName);
        console.log('ShopRequest created:', shopRequest);
        // Create a user with role subadmin, status pending (disable login until approved), and shopId
        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = new User({ username: owner, email, password: hashedPassword, role: 'subadmin', active: false, shopId: shopRequest._id });
        await newUser.save();
        // Link userRef in shopRequest
        shopRequest.userRef = newUser._id;
        await shopRequest.save();
        // Create wallet for this shop
        await createWalletForShop(shopRequest._id);
        res.status(201).json({ message: 'Shop registration submitted for review. You will be notified after admin approval.' });
    } catch (error) {
        res.status(500).json({ message: error.message || 'Error registering shop', error });
    }
};