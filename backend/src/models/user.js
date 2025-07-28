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
        enum: ['user', 'admin', 'subadmin', 'seller'], // Added 'seller' role
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
        required: function() { return this.role === 'seller' || this.role === 'subadmin'; } // required for seller and subadmin
    },
    // Ensure every user (buyer) has a unique _id (MongoDB default)
    // Seller must have unique sellerId and required shopId
    sellerId: {
        type: String,
        required: function() { return this.role === 'seller'; },
        unique: true // globally unique for sellers
    },
    active: {
        type: Boolean,
        default: true,
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
    cart: [{
        product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
        quantity: { type: Number, default: 1 }
    }],
}, { timestamps: true });

const User = mongoose.model('User', userSchema);

module.exports = User;