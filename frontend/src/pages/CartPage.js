import React, { useState } from 'react';
import { placeOrder } from '../api/orderApi';

const CartPage = () => {
  const cart = JSON.parse(localStorage.getItem('cart')) || [];
  const total = cart.reduce((sum, item) => sum + (item.price * (item.quantity || 1)), 0);
  const [message, setMessage] = useState('');

  const handlePayNow = async () => {
    const token = localStorage.getItem('token');
    try {
      await placeOrder({ headers: { Authorization: `Bearer ${token}` } });
      setMessage('Order placed successfully!');
      localStorage.removeItem('cart');
    } catch (err) {
      setMessage('Order failed: ' + (err.response?.data?.error || err.message));
    }
  };

  if (cart.length === 0) return <div style={{padding: '2rem'}}><h2>Your cart is empty.</h2></div>;

  return (
    <div style={{maxWidth: 600, margin: '2rem auto', background: '#fff', borderRadius: 8, boxShadow: '0 2px 8px #eee', padding: 24}}>
      <h2>Your Cart</h2>
      <ul style={{listStyle: 'none', padding: 0}}>
        {cart.map(item => (
          <li key={item._id} style={{marginBottom: 16, borderBottom: '1px solid #eee', paddingBottom: 8}}>
            <div style={{display: 'flex', alignItems: 'center'}}>
              {item.image && <img src={item.image} alt={item.name} style={{width: 60, height: 60, objectFit: 'cover', borderRadius: 4, marginRight: 16}} />}
              <div style={{flex: 1}}>
                <strong>{item.name}</strong><br/>
                <span>Price: ${item.price} x {item.quantity || 1}</span><br/>
                <span>Total: ${(item.price * (item.quantity || 1)).toFixed(2)}</span>
              </div>
            </div>
          </li>
        ))}
      </ul>
      <div style={{marginTop: 24, fontWeight: 'bold', fontSize: 18}}>
        Cart Total: ${total.toFixed(2)}
      </div>
      <div style={{marginTop: 24}}>
        <h3>Payment Options</h3>
        <button
          style={{padding: '0.5rem 2rem', background: '#27ae60', color: '#fff', border: 'none', borderRadius: 4, fontSize: 16, cursor: 'pointer'}}
          onClick={handlePayNow}
        >
          Pay Now (Demo)
        </button>
        {message && <div style={{marginTop: 16, color: message.startsWith('Order placed') ? 'green' : 'red'}}>{message}</div>}
      </div>
    </div>
  );
};

export default CartPage;
