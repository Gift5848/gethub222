const Product = require('../models/product');
const User = require('../models/user');

// Get all products with optional filters
exports.getProducts = async (req, res) => {
    try {
        const query = {};
        if (req.query.make) query.make = req.query.make;
        if (req.query.model) query.model = req.query.model;
        if (req.query.year) query.year = req.query.year;
        if (req.query.search) {
            query.$or = [
                { name: { $regex: req.query.search, $options: 'i' } },
                { description: { $regex: req.query.search, $options: 'i' } }
            ];
        }
        // --- Seller: only see their own products ---
        if (req.user && req.user.role === 'user') {
            query.owner = req.user._id;
            query.shopId = req.user.shopId;
        }
        // --- Subadmin strict access: only products for their own shop ---
        if (req.user && req.user.role === 'subadmin') {
            query.shopId = req.user.shopId;
        }
        if (req.query.shopId) query.shopId = req.query.shopId; // Allow admin to filter by shopId
        const products = await Product.find(query)
            .populate({ path: 'owner', select: 'username email' })
            .populate({ path: 'shopId', select: 'shopName' });
        res.json(products);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// Get single product by ID
exports.getProductById = async (req, res) => {
    try {
        // Populate owner and seller with username/email/phone
        const product = await Product.findById(req.params.id)
            .populate('owner', 'username email phone')
            .populate('seller', 'username email phone');
        if (!product) return res.status(404).json({ error: 'Product not found' });
        // --- Seller: only see their own products ---
        if (req.user && req.user.role === 'user' && (String(product.owner._id) !== String(req.user._id) || product.shopId !== req.user.shopId)) {
            return res.status(403).json({ error: 'Not authorized to view this product' });
        }
        // --- Subadmin strict access: only their shop's products ---
        if (req.user && req.user.role === 'subadmin' && product.shopId !== req.user.shopId) {
            return res.status(403).json({ error: 'Not authorized to view this product' });
        }
        // Return product, seller, and owner info
        res.json({
            ...product.toObject(),
            sellerPhone: product.seller?.phone || product.owner?.phone || '',
            sellerName: product.seller?.username || product.owner?.username || '',
            sellerEmail: product.seller?.email || product.owner?.email || ''
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// Create a new product
exports.createProduct = async (req, res) => {
    try {
        // Privilege check removed for all roles
        // Check free post limit
        const user = await User.findById(req.user._id);
        if (user.postCount >= 3 && !req.body.paid) {
            return res.status(403).json({ error: 'Free post limit reached. Please pay to post more items.' });
        }
        let productData = req.body;
        if (req.file) {
            productData.image = `/uploads/${req.file.filename}`;
        }
        // Store payment info for paid posts
        if (req.body.paid) {
            productData.paymentMethod = req.body.paymentMethod || '';
            productData.paymentCode = req.body.paymentCode || '';
            productData.postFee = 10; // 10 birr per paid post
        }
        // Always set shopId and managerId from the authenticated user
        productData.owner = req.user._id;
        // Always fetch the seller from DB to get the latest shopId and sellerId
        const sellerUser = await User.findById(req.user._id);
        productData.shopId = sellerUser && sellerUser.shopId ? sellerUser.shopId : undefined;
        productData.sellerId = sellerUser && sellerUser.sellerId ? sellerUser.sellerId : undefined; // Ensure sellerId is set
        productData.managerId = req.user.role === 'subadmin' ? req.user.managerId || req.user._id : req.user._id;
        // Set ownerRole for conditional shopId validation
        if (req.user && req.user.role) {
            productData.ownerRole = req.user.role;
        }
        // Add initial stock history
        productData.stockHistory = [{
            date: new Date(),
            change: productData.stock || 0,
            reason: 'Initial stock',
            user: req.user.email || req.user.username || String(req.user._id)
        }];
        const product = new Product(productData);
        await product.save();
        // Increment postCount for free posts
        if (req.user && req.user.role === 'user') {
            const user = await User.findById(req.user._id);
            if (user.postCount < 3) {
                user.postCount += 1;
                await user.save();
            }
        }
        res.status(201).json(product);
    } catch (err) {
        console.error('Product creation error:', err.message, err);
        res.status(400).json({ error: err.message, details: err });
    }
};

// Update a product
exports.updateProduct = async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);
        if (!product) return res.status(404).json({ error: 'Product not found' });
        // --- Privilege check: only allow if seller has canEditProducts ---
        if (req.user && req.user.role === 'user') {
            if (!req.user.privileges?.canEditProducts) {
                return res.status(403).json({ error: 'You do not have permission to edit products.' });
            }
        }
        // --- Seller: only update their own products ---
        if (req.user && req.user.role === 'user' && (String(product.owner) !== String(req.user._id) || product.shopId !== req.user.shopId)) {
            return res.status(403).json({ error: 'Not authorized to update this product' });
        }
        // --- Subadmin strict access: only their shop's products ---
        if (req.user && req.user.role === 'subadmin' && product.shopId !== req.user.shopId) {
            return res.status(403).json({ error: 'Not authorized to update this product' });
        }
        // Track stock change
        const oldStock = product.stock;
        Object.assign(product, req.body);
        // Never allow changing shopId/managerId/owner from update
        product.shopId = product.shopId;
        product.managerId = product.managerId;
        product.owner = product.owner;
        // --- Only allow updating sellerId/shopId if admin ---
        if (req.user && req.user.role !== 'admin') {
            // Always keep sellerId and shopId in sync with the seller user
            const sellerUser = await User.findById(product.owner);
            if (sellerUser) {
                product.sellerId = sellerUser.sellerId;
                product.shopId = sellerUser.shopId;
            }
        }
        // If stock changed, log it
        if (typeof req.body.stock !== 'undefined' && req.body.stock !== oldStock) {
            product.stockHistory = product.stockHistory || [];
            product.stockHistory.push({
                date: new Date(),
                change: req.body.stock - oldStock,
                reason: req.body.stock > oldStock ? 'Stock increased' : 'Stock decreased',
                user: req.user.email || req.user.username || String(req.user._id)
            });
        }
        await product.save();
        res.json(product);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
};

// Delete a product
exports.deleteProduct = async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);
        if (!product) return res.status(404).json({ error: 'Product not found' });
        // --- Privilege check: only allow if seller has canDeleteProducts ---
        if (req.user && req.user.role === 'user') {
            if (!req.user.privileges?.canDeleteProducts) {
                return res.status(403).json({ error: 'You do not have permission to delete products.' });
            }
        }
        // --- Seller: only delete their own products ---
        if (req.user && req.user.role === 'user' && (String(product.owner) !== String(req.user._id) || product.shopId !== req.user.shopId)) {
            return res.status(403).json({ error: 'Not authorized to delete this product' });
        }
        // --- Subadmin strict access: only their shop's products ---
        if (req.user && req.user.role === 'subadmin' && product.shopId !== req.user.shopId) {
            return res.status(403).json({ error: 'Not authorized to delete this product' });
        }
        await product.deleteOne();
        res.json({ message: 'Product deleted' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
