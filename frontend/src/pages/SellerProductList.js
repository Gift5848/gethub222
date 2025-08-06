import React, { useEffect, useState } from 'react';
import axios from 'axios';
import ShopWalletSummary from './ShopWalletSummary';

const API_BASE = `http://${window.location.hostname}:5000/api`;

function SellerProductList() {
  const [products, setProducts] = useState([]);
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  useEffect(() => {
    if (user && user.token) {
      let url = `${API_BASE}/products`;
      if (user.shopId) {
        url += `?shopId=${user.shopId}`;
      }
      axios.get(url, { headers: { Authorization: `Bearer ${user.token}` } })
        .then(res => {
          setProducts(res.data);
          // Debug: show info in console and alert
          console.log('User shopId:', user.shopId);
          console.log('Products:', res.data);
          alert(`Debug Info:\nUser shopId: ${user.shopId || 'N/A'}\nProducts: ${JSON.stringify(res.data)}`);
        })
        .catch(() => setProducts([]));
    }
  }, [user]);

  const handleDelete = async (productId) => {
    if (!window.confirm('Are you sure you want to delete this product?')) return;
    try {
      await axios.delete(`${API_BASE}/products/${productId}`, {
        headers: { Authorization: `Bearer ${user.token}` }
      });
      setProducts(prev => prev.filter(p => p._id !== productId));
    } catch {
      alert('Failed to delete product.');
    }
  };

  // Add edit logic as needed

  return (
    <div style={{ maxWidth: 900, margin: '40px auto' }}>
      <ShopWalletSummary />
      <h2>My Products</h2>
      <table>
        <thead>
          <tr>
            <th>Name</th><th>Price</th><th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {products.map(p => (
            <tr key={p._id}>
              <td>{p.name}</td>
              <td>{p.price}</td>
              <td>
                <button onClick={() => {/* handle edit */}}>Edit</button>
                <button onClick={() => handleDelete(p._id)}>Delete</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default SellerProductList;
