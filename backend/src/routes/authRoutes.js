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

module.exports = router;