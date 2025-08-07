// Script to list all collections and document counts in your MongoDB Atlas database
// Usage: node checkAtlasCollections.js

const mongoose = require('mongoose');
const readline = require('readline');

async function main() {
  let MONGO_URI = process.env.MONGO_URI;
  if (!MONGO_URI) {
    // Prompt for connection string if not set
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    MONGO_URI = await new Promise(resolve => rl.question('Paste your MongoDB Atlas connection string: ', resolve));
    rl.close();
  }
  try {
    await mongoose.connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });
    const db = mongoose.connection.db;
    const collections = await db.listCollections().toArray();
    console.log('Collections and document counts:');
    for (const col of collections) {
      const count = await db.collection(col.name).countDocuments();
      console.log(`- ${col.name}: ${count} documents`);
    }
    await mongoose.disconnect();
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

main();
