const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
    name: { type: String, required: true },
    description: String,
    price: { type: Number, required: true },
    image: String,
    category: String,
    stock: { type: Number, default: 0 },
    make: String,
    model: String,
    year: String,
    createdAt: { type: Date, default: Date.now },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    shopId: { type: mongoose.Schema.Types.ObjectId, ref: 'ShopRequest' }, // Shop isolation, now ObjectId for population
    managerId: { type: String, required: true }, // Subadmin/manager who created/owns this product
    stockHistory: [{
        date: { type: Date, default: Date.now },
        change: Number, // e.g. +5, -2
        reason: String, // e.g. 'Manual update', 'Order placed', etc.
        user: { type: String } // userId or username
    }],
    paymentMethod: { type: String },
    paymentCode: { type: String },
    postFee: { type: Number, default: 0 },
    seller: { type: mongoose.Schema.Types.ObjectId, ref: 'User' } // New field added
});

module.exports = mongoose.model('Product', productSchema);
