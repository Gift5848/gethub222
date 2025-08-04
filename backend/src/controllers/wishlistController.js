const User = require('../models/user');
const Product = require('../models/product');

// Get user's wishlist
exports.getWishlist = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).populate('wishlist');
    res.json(user.wishlist || []);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Add product to wishlist
exports.addToWishlist = async (req, res) => {
  try {
    const { productId } = req.body;
    if (!productId) return res.status(400).json({ error: 'Missing productId' });
    await User.findByIdAndUpdate(req.user._id, { $addToSet: { wishlist: productId } });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Remove product from wishlist
exports.removeFromWishlist = async (req, res) => {
  try {
    const { productId } = req.body;
    if (!productId) return res.status(400).json({ error: 'Missing productId' });
    await User.findByIdAndUpdate(req.user._id, { $pull: { wishlist: productId } });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Remove all products from wishlist
exports.clearWishlist = async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.user._id, { $set: { wishlist: [] } });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
