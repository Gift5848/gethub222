const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const User = require('../src/models/user');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/auto_spareparts'; // Update your db name if needed

async function createAdmin() {
    await mongoose.connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });
    const username = 'admin';
    const email = 'admin@example.com';
    const password = 'admin123'; // Change after login for security
    const hashedPassword = await bcrypt.hash(password, 10);
    const existingAdmin = await User.findOne({ role: 'admin' });
    if (existingAdmin) {
        console.log('Admin already exists:', existingAdmin);
        process.exit(0);
    }
    // Ensure sellerId is not set for admin
    const admin = new User({ username, email, password: hashedPassword, role: 'admin' }); // sellerId field removed
    await admin.save();
    console.log('Admin user created:', admin);
    process.exit(0);
}

createAdmin().catch(err => {
    console.error('Error creating admin:', err);
    process.exit(1);
});
