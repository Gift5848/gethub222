const express = require('express');
const { register, login, listUsers, deleteUser, createSubAdmin, updateUser, listSellersForSubadmin, createSellerForSubadmin, updateSellerForSubadmin, deleteSellerForSubadmin, resetSellerPasswordForSubadmin, toggleSellerStatusForSubadmin, forgotPassword, resetPassword, registerShop } = require('../controllers/authController');
const router = express.Router();
const auth = require('../middleware/authMiddleware');
const { adminOnly, requireSubadmin } = require('../middleware/authMiddleware');
const User = require('../models/user');
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

// Subadmin seller management
router.get('/subadmin/sellers', auth, requireSubadmin, listSellersForSubadmin);
router.post('/subadmin/sellers', auth, requireSubadmin, createSellerForSubadmin);
router.put('/subadmin/sellers/:id', auth, requireSubadmin, updateSellerForSubadmin);
router.delete('/subadmin/sellers/:id', auth, requireSubadmin, deleteSellerForSubadmin);
router.post('/subadmin/sellers/:id/reset-password', auth, requireSubadmin, resetSellerPasswordForSubadmin);
router.post('/subadmin/sellers/:id/toggle-status', auth, requireSubadmin, toggleSellerStatusForSubadmin);

module.exports = router;