import React, { useState } from 'react';
import { placeOrder } from '../api/orderApi';

const Checkout = () => {
  const [cart] = useState(JSON.parse(localStorage.getItem('cart')) || []);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handleCheckout = async () => {
    setLoading(true);
    setMessage('');
    try {
      const token = localStorage.getItem('token');
      // Fetch product details for each cart item
      const productDetails = await Promise.all(cart.map(async item => {
        const res = await fetch(`http://localhost:5000/api/products/${item._id}`);
        return await res.json();
      }));
      // Prepare order data for backend
      const seller = productDetails[0]?.owner?._id || productDetails[0]?.owner || '';
      const shopId = productDetails[0]?.shopId || '';
      if (!seller || !shopId) {
        setMessage(`Order failed: Missing required field(s). seller: ${seller}, shopId: ${shopId}`);
        setLoading(false);
        return;
      }
      const orderData = {
        products: cart.map((item, idx) => ({
          product: item._id,
          quantity: item.quantity || 1,
          price: item.price
        })),
        total: cart.reduce((sum, item) => sum + (item.price * (item.quantity || 1)), 0),
        seller,
        shopId
      };
      console.log('Order payload:', orderData);
      const res = await placeOrder(orderData, token);
      localStorage.removeItem('cart');
      setMessage('Order placed successfully!');
    } catch (err) {
      setMessage('Order failed: ' + (err.response?.data?.error || err.message));
    }
    setLoading(false);
  };

  if (cart.length === 0) return <div>Your cart is empty.</div>;

  const total = cart.reduce((sum, item) => sum + (item.price * (item.quantity || 1)), 0);

  return (
    <div>
      <h3>Checkout</h3>
      <ul>
        {cart.map(item => (
          <li key={item._id}>
            {item.name} - ${item.price} x {item.quantity || 1}
          </li>
        ))}
      </ul>
      <div><strong>Total: ${total.toFixed(2)}</strong></div>
      <button onClick={handleCheckout} disabled={loading}>{loading ? 'Placing Order...' : 'Place Order'}</button>
      <div>{message}</div>
    </div>
  );
};

export default Checkout;
