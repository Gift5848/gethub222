const mongoose = require('mongoose');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/auto_spareparts';

async function fixIndexes() {
    await mongoose.connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });
    const db = mongoose.connection.db;
    // Drop and recreate sellerId index
    try {
        await db.collection('users').dropIndex('sellerId_1');
        console.log('Dropped sellerId_1 index.');
    } catch (err) {
        if (err.codeName === 'IndexNotFound') {
            console.log('sellerId_1 index not found, skipping drop.');
        } else {
            console.error('Error dropping sellerId index:', err);
            process.exit(1);
        }
    }
    await db.collection('users').createIndex({ sellerId: 1 }, { unique: true, sparse: true });
    console.log('Created sparse unique index on sellerId.');
    // Drop and recreate buyerId index
    try {
        await db.collection('users').dropIndex('buyerId_1');
        console.log('Dropped buyerId_1 index.');
    } catch (err) {
        if (err.codeName === 'IndexNotFound') {
            console.log('buyerId_1 index not found, skipping drop.');
        } else {
            console.error('Error dropping buyerId index:', err);
            process.exit(1);
        }
    }
    await db.collection('users').createIndex({ buyerId: 1 }, { unique: true, sparse: true });
    console.log('Created sparse unique index on buyerId.');
    process.exit(0);
}

fixIndexes().catch(err => {
    console.error('Error fixing indexes:', err);
    process.exit(1);
});
