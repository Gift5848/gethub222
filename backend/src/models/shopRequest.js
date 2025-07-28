const mongoose = require('mongoose');

const shopRequestSchema = new mongoose.Schema({
  shopName: { type: String, required: true },
  licenseCertificate: String, // path to uploaded file
  tin: String,
  location: String,
  address: String,
  owner: { type: String, required: true }, // Owner name
  email: { type: String, required: true },
  phone: String,
  status: { type: String, enum: ['pending', 'approved', 'rejected', 'info_requested'], default: 'pending' },
  adminNote: String,
  userRef: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
}, { collection: 'shoprequests' });

module.exports = mongoose.model('ShopRequest', shopRequestSchema);
