// Script to print the API response for /api/products
const axios = require('axios');

const API_URL = 'http://localhost:5000/api/products';

async function main() {
  try {
    const res = await axios.get(API_URL);
    console.log('API /api/products response:');
    for (const product of res.data) {
      console.log({
        _id: product._id,
        name: product.name,
        shopId: product.shopId,
        shopName: product.shopId && product.shopId.shopName,
        owner: product.owner && product.owner.username
      });
    }
  } catch (err) {
    console.error('Error fetching products:', err.message);
  }
}

main();
