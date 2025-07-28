const mongoose = require('mongoose');
const Product = require('./src/models/product');

// Replace with your actual MongoDB connection string
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/auto_spareparts';

async function main() {
  await mongoose.connect(MONGO_URI);

  // Fetch and log a specific product by ID
  const productId = '688341d0d7dbf97373a64ffe'; // Replace with your product ID
  const product = await Product.findById(productId);
  if (!product) {
    console.log('Product not found');
  } else {
    console.log('Fetched product:', product);
    console.log('seller field:', product.seller);
    console.log('owner field:', product.owner);
  }
  mongoose.disconnect();
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
