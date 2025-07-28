const Product = require('../models/product');
const User = require('../models/user');
const ShopRequest = require('../models/shopRequest');
// If you have an Order model, import it here
// const Order = require('../models/order');

// Mock: Replace with real order aggregation if you have an Order model
async function getSalesSummary() {
    // Example: return { totalSales: 100, totalRevenue: 5000 };
    return { totalSales: 0, totalRevenue: 0 };
}

exports.getAnalytics = async (req, res) => {
    try {
        const productCount = await Product.countDocuments();
        const userCount = await User.countDocuments();
        // Add more analytics as needed
        const salesSummary = await getSalesSummary();
        res.json({
            productCount,
            userCount,
            ...salesSummary
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// Simple in-memory log for demo; replace with DB-backed log for production
const activityLog = [];

exports.logActivity = (action, user) => {
    activityLog.unshift({
        action,
        user: user ? { id: user._id, username: user.username, role: user.role } : null,
        timestamp: new Date()
    });
    if (activityLog.length > 100) activityLog.pop();
};

exports.getActivityLog = async (req, res) => {
    res.json(activityLog.slice(0, 20)); // Return latest 20
};

// --- Notifications (in-memory, mock for now) ---
let notifications = [
    { id: 1, message: 'New user registered', read: false, createdAt: new Date() },
    { id: 2, message: 'Low stock: Brake Pads', read: false, createdAt: new Date() },
    { id: 3, message: 'Order #1234 placed', read: false, createdAt: new Date() }
];

exports.getNotifications = async (req, res) => {
    res.json(notifications.slice(0, 10));
};

exports.markNotificationRead = async (req, res) => {
    const { id } = req.params;
    notifications = notifications.map(n => n.id === Number(id) ? { ...n, read: true } : n);
    res.json({ success: true });
};

// --- Shop Requests (admin) ---

// List all shop registration requests (admin only)
exports.getShopRequests = async (req, res) => {
    // Debug logging
    console.log('getShopRequests called');
    console.log('Method:', req.method);
    console.log('URL:', req.originalUrl);
    console.log('Headers:', req.headers);
    if (req.user) {
        console.log('User:', req.user);
    } else {
        console.log('No req.user');
    }
    try {
        // Only return pending requests
        const requests = await ShopRequest.find({ status: 'pending' }).sort({ createdAt: -1 });
        console.log('ShopRequest.find() result:', JSON.stringify(requests, null, 2));
        res.json(requests);
    } catch (err) {
        console.log('getShopRequests error:', err);
        res.status(500).json({ message: err.message });
    }
};

// Handle shop request action (approve/reject/request info)
exports.handleShopRequestAction = async (req, res) => {
    const { id } = req.params;
    const { action, adminNote } = req.body;
    try {
        const request = await ShopRequest.findById(id);
        if (!request) return res.status(404).json({ message: 'Shop request not found.' });
        if (action === 'approve') {
            request.status = 'approved';
            // Activate the subadmin user and ensure role is 'subadmin'
            if (request.userRef) {
                await User.findByIdAndUpdate(request.userRef, { active: true, role: 'subadmin' });
            }
        } else if (action === 'reject') {
            request.status = 'rejected';
            if (request.userRef) {
                await User.findByIdAndUpdate(request.userRef, { active: false });
            }
        } else if (action === 'info_requested') {
            request.status = 'info_requested';
        }
        if (adminNote) request.adminNote = adminNote;
        request.updatedAt = new Date();
        await request.save();
        res.json({ message: `Shop request ${action}d.`, request });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};
