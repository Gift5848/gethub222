const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  products: [
    {
      product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
      quantity: { type: Number, required: true },
      price: { type: Number, required: true }
    }
  ],
  total: { type: Number, required: true },
  buyer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  seller: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, // subadmin
  status: { type: String, default: 'pending' },
  paymentStatus: { type: String, default: 'unpaid' }, // unpaid, paid, failed
  shopId: { type: mongoose.Schema.Types.ObjectId, ref: 'ShopRequest', required: true }, // Shop isolation
  deliveryPerson: { type: String, default: '' }, // Delivery person name or ID
  createdAt: { type: Date, default: Date.now },
  proofOfDelivery: { type: String }, // Path to uploaded proof image
  shippingAddress: { type: String, default: '' },
  trackingNumber: { type: String, default: '' },
  reviews: [
    {
      user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      rating: { type: Number, min: 1, max: 5 },
      comment: String,
      createdAt: { type: Date, default: Date.now }
    }
  ],
  paymentMethod: { type: String, enum: ['cbe', 'telebirr', 'chapa'], required: true },
  paymentTransaction: { type: String }, // Transaction number/reference for cbe/telebirr
  paymentApprovalStatus: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  receiptUrl: { type: String } // Path to uploaded payment receipt
});

module.exports = mongoose.model('Order', orderSchema);
