const mongoose = require('mongoose');
const ShopRequest = require('./shopRequest');

const userSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true,
        unique: true,
    },
    email: {
        type: String,
        required: true,
        unique: true,
    },
    password: {
        type: String,
        required: true,
    },
    role: {
        type: String,
        enum: ['user', 'admin', 'subadmin', 'seller', 'delivery'], // Added 'delivery' role
        default: 'user',
    },
    owner: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: function() { return this.role === 'seller'; }
    },
    shopId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'ShopRequest',
        required: function() { return this.role === 'seller'; } // Only required for seller
    },
    sellerId: {
        type: String,
        required: function() { return this.role === 'seller'; }, // Only required for seller
        unique: false // unique per shop, not globally
    },
    active: {
        type: Boolean,
        default: true,
    },
    approved: {
        type: Boolean,
        default: false,
    },
    privileges: {
        type: Object,
        default: {
            canAddProducts: true,
            canEditProducts: true,
            canDeleteProducts: true,
            canViewOrders: true,
            canManageProfile: true,
            canViewOwnSales: true, // Seller-specific privilege
            canManageOwnProducts: true // Seller-specific privilege
        }
    },
    resetPasswordToken: {
        type: String,
    },
    resetPasswordExpires: {
        type: Date,
    },
    postCount: {
        type: Number,
        default: 0,
    },
    wishlist: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Product' }],
    phone: {
        type: String,
        required: true,
    },
}, { timestamps: true });

const User = mongoose.model('User', userSchema);

module.exports = User;