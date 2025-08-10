const express = require('express');
const { register, login, listUsers, deleteUser, createSubAdmin, updateUser, listSellersForSubadmin, createSellerForSubadmin, updateSellerForSubadmin, deleteSellerForSubadmin, resetSellerPasswordForSubadmin, toggleSellerStatusForSubadmin, forgotPassword, resetPassword, registerShop } = require('../controllers/authController');
const router = express.Router();
const auth = require('../middleware/authMiddleware');
const { adminOnly, requireSubadmin } = require('../middleware/authMiddleware');
const User = require('../models/user');
const Product = require('../models/product');
const uploadLicense = require('../middleware/uploadLicense');

router.post('/register', register);
router.post('/register-shop', uploadLicense.single('licenseCertificate'), registerShop); // Shop registration with license upload
router.post('/login', login);
router.get('/users', auth, adminOnly, listUsers); // Admin only
router.delete('/users/:id', auth, adminOnly, deleteUser); // Admin only
router.post('/subadmin', auth, adminOnly, createSubAdmin); // Admin only
router.put('/users/:id', auth, adminOnly, updateUser); // Admin only
router.get('/me', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) return res.status(404).json({ message: 'User not found.' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: 'Server error.' });
  }
});
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);

// Protect all /subadmin* routes with requireSubadmin middleware
router.use('/subadmin', auth, requireSubadmin);

// Protect the subadmin dashboard root route
router.get('/subadmin', auth, requireSubadmin, (req, res) => {
  res.json({ message: 'Subadmin dashboard access granted.' });
});

// Subadmin seller management
router.get('/subadmin/sellers', listSellersForSubadmin); // already protected above
router.post('/subadmin/sellers', createSellerForSubadmin); // already protected above
router.put('/subadmin/sellers/:id', updateSellerForSubadmin); // already protected above
router.delete('/subadmin/sellers/:id', deleteSellerForSubadmin); // already protected above
router.post('/subadmin/sellers/:id/reset-password', resetSellerPasswordForSubadmin); // already protected above
router.post('/subadmin/sellers/:id/toggle-status', toggleSellerStatusForSubadmin); // already protected above

// Subadmin managed products endpoint
router.get('/subadmin/products-managed', async (req, res) => {
  try {
    // Find products where managerId matches the subadmin's user ID
    const products = await Product.find({ managerId: req.user.id });
    res.json(products);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Logout endpoint (client should just remove token, but respond OK)
router.post('/logout', (req, res) => {
  res.json({ message: 'Logged out successfully.' });
});

router.post('/admin/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ message: 'Username and password are required.' });
  }
  try {
    const user = await User.findOne({ username, role: 'admin' });
    if (!user) {
      return res.status(404).json({ message: 'Admin not found' });
    }
    const isMatch = await require('bcrypt').compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    const token = require('jsonwebtoken').sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '1h' });
    res.status(200).json({
      token,
      user: {
        _id: user._id,
        username: user.username,
        role: user.role
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message || 'Error logging in', error });
  }
});

module.exports = router;