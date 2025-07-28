const mongoose = require('mongoose');
const Product = require('./src/models/product');
const User = require('./src/models/user');

// Replace with your actual MongoDB connection string
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/auto_spareparts';

async function main() {
  await mongoose.connect(MONGO_URI);

  // Find a valid user and shopId
  const user = await User.findOne({});
  if (!user) throw new Error('No user found');
  const shopId = user.shopId || (await User.findOne({ shopId: { $exists: true } }))?.shopId;
  if (!shopId) throw new Error('No shopId found');

  // Update products
  await Product.updateMany(
    { seller: { $exists: false } },
    { $set: { seller: user._id } }
  );
  // Update users
  await User.updateMany(
    { shopId: { $exists: false } },
    { $set: { shopId: shopId } }
  );
  // Set seller field to owner for all products
  await Product.updateMany(
    { owner: { $exists: true } },
    [{ $set: { seller: "$owner" } }]
  );

  // Fix seller field for all products by copying owner
  const products = await Product.find({});
  for (const prod of products) {
    if (prod.owner && !prod.seller) {
      prod.seller = prod.owner;
      await prod.save();
      console.log(`Updated product ${prod._id} seller to ${prod.owner}`);
    }
  }
  // Diagnostic: log first product and its seller field
  const firstProduct = await Product.findOne({});
  if (firstProduct) {
    console.log('First product:', firstProduct._id.toString());
    console.log('Seller field:', firstProduct.seller);
  } else {
    console.log('No products found in database.');
  }

  // Log all products missing seller for manual fix
  const missingSellerProducts = await Product.find({ $or: [ { seller: { $exists: false } }, { seller: null } ] });
  if (missingSellerProducts.length) {
    console.log('Products missing seller field:');
    missingSellerProducts.forEach(prod => {
      console.log(`Product _id: ${prod._id}, name: ${prod.name}, owner: ${prod.owner}`);
    });
  } else {
    console.log('All products have seller field set.');
  }

  console.log('Data fix complete!');
  mongoose.disconnect();
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
