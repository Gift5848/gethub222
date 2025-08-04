import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { placeOrder } from '../api/orderApi';

const Checkout = () => {
  const user = JSON.parse(localStorage.getItem('user'));
  const userId = user?._id || 'guest';
  const cartKey = `cart_${userId}`;
  const [cart, setCart] = useState([]);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // Always load latest cart from localStorage for this user
  useEffect(() => {
    setCart(JSON.parse(localStorage.getItem(cartKey)) || []);
  }, [cartKey]);

  const handleCheckout = async () => {
    setLoading(true);
    setMessage('');
    try {
      const token = localStorage.getItem('token');
      const user = JSON.parse(localStorage.getItem('user'));
      const seller = cart[0]?.sellerId || cart[0]?.seller || '';
      if (!user?._id || !seller) {
        setMessage(`Order failed: Missing required field(s). seller: ${seller}, buyer: ${user?._id}`);
        setLoading(false);
        return;
      }
      const res = await placeOrder({
        cart,
        buyer: user._id,
        seller,
        token
      });
      localStorage.removeItem(cartKey); // Remove correct cart key
      setCart([]); // Clear cart state after order
      setMessage('Order placed successfully!');
      // Redirect to confirmation page with order details
      navigate('/order-confirmation', { state: { order: res.data } });
    } catch (err) {
      setMessage('Order failed: ' + (err.response?.data?.message || err.message));
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
