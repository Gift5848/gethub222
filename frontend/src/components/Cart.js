import React, { useState, useEffect } from 'react';
import { useHistory } from 'react-router-dom';
import axios from 'axios';
import { placeOrder as placeOrderApi } from '../api/orderApi';

const Cart = ({ onClose, onCheckout, onCartCountChange }) => {
  const [cart, setCart] = useState([]);
  const history = useHistory();

  useEffect(() => {
    const storedCart = JSON.parse(localStorage.getItem('cart')) || [];
    setCart(storedCart);
    if (onCartCountChange) {
      const count = storedCart.reduce((sum, item) => sum + (item.quantity || 1), 0);
      onCartCountChange(count);
    }
  }, []);

  useEffect(() => {
    // Listen for cart changes in other tabs/windows
    const handleStorage = (e) => {
      if (e.key === 'cart') {
        const updated = JSON.parse(e.newValue) || [];
        setCart(updated);
        if (onCartCountChange) {
          const count = updated.reduce((sum, item) => sum + (item.quantity || 1), 0);
          onCartCountChange(count);
        }
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, [onCartCountChange]);

  const updateCartAndCount = (updatedCart) => {
    setCart(updatedCart);
    localStorage.setItem('cart', JSON.stringify(updatedCart));
    if (onCartCountChange) {
      const count = updatedCart.reduce((sum, item) => sum + (item.quantity || 1), 0);
      onCartCountChange(count);
    }
  };

  const removeFromCart = (id) => {
    const updatedCart = cart.filter(item => item._id !== id);
    updateCartAndCount(updatedCart);
  };

  const updateQuantity = (id, delta) => {
    setCart(prev => {
      const updated = prev.map(item => {
        if (item._id === id) {
          const maxQty = item.stock || 1;
          const newQty = Math.max(1, Math.min((item.quantity || 1) + delta, maxQty));
          return { ...item, quantity: newQty };
        }
        return item;
      });
      localStorage.setItem('cart', JSON.stringify(updated));
      if (onCartCountChange) {
        const count = updated.reduce((sum, item) => sum + (item.quantity || 1), 0);
        onCartCountChange(count);
      }
      return updated;
    });
  };

  const total = cart.reduce((sum, item) => sum + (item.price * (item.quantity || 1)), 0);

  const handleCheckout = () => {
    if (onCheckout) {
      onCheckout(cart, total);
    } else {
      history.push('/checkout');
    }
  };

  const placeOrder = async () => {
    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    if (!token) {
      alert('You must be logged in to place an order. Please log in and try again.');
      return;
    }
    try {
      await placeOrderApi({
        headers: { Authorization: `Bearer ${token}` },
        data: { buyerId: user.buyerId }
      });
      localStorage.setItem('cart', JSON.stringify([]));
      setCart([]);
      if (onCartCountChange) onCartCountChange(0);
      history.push('/orders');
    } catch (err) {
      const msg = err.response?.data?.error || err.message || 'Failed to place order.';
      alert('Failed to place order: ' + msg);
    }
  };

  // Only render the cart popup if there are items in the cart
  if (!cart || cart.length === 0) return null;

  return (
    <div className="cart-popup-overlay" style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100vw',
      height: '100vh',
      background: 'rgba(44, 62, 80, 0.25)',
      zIndex: 9999,
      display: 'flex',
      alignItems: 'stretch',
      justifyContent: 'flex-end',
    }}>
      <div className="cart-popup" style={{
        background: '#fff',
        borderRadius: '0 0 0 0',
        boxShadow: '-4px 0 32px rgba(44,62,80,0.18)',
        minWidth: 380,
        maxWidth: 420,
        width: '100%',
        maxHeight: '100vh',
        height: '100vh',
        overflowY: 'auto',
        padding: 0,
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
      }}>
        {/* Header */}
        <div className="cart-header" style={{
          background: '#42546e',
          color: '#fff',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '24px 24px 18px 24px',
          borderTopLeftRadius: 0,
          borderTopRightRadius: 0,
        }}>
          <span style={{ fontWeight: 700, fontSize: 26, letterSpacing: 0.5 }}>Your Cart</span>
          <button className="cart-close" onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 28, color: '#fff', cursor: 'pointer', fontWeight: 700, lineHeight: 1 }}>&times;</button>
        </div>
        {/* Cart Items */}
        <div className="cart-list" style={{ flex: 1, padding: '24px 24px 0 24px', overflowY: 'auto' }}>
          {cart.map((item, idx) => (
            <div key={item._id} style={{
              display: 'flex',
              gap: 18,
              alignItems: 'flex-start',
              borderBottom: idx !== cart.length - 1 ? '1px solid #ededed' : 'none',
              paddingBottom: 22,
              marginBottom: 22,
            }}>
              <img src={
                item.image?.startsWith('http')
                  ? item.image
                  : item.image
                    ? `http://localhost:5000/uploads/${item.image}`
                    : '/default-product.png'
              } alt={item.name} style={{ width: 80, height: 80, objectFit: 'cover', borderRadius: 8, boxShadow: '0 2px 8px #e0e0e0', background: '#f8f8f8' }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 19, color: '#222', marginBottom: 2 }}>{item.name}</div>
                <div style={{ color: '#e74c3c', fontWeight: 700, fontSize: 20, marginBottom: 8 }}>ETB {item.price.toLocaleString()}</div>
                <div style={{ color: '#888', fontSize: 15, marginBottom: 10 }}>{item.desc}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <button onClick={() => updateQuantity(item._id, -1)} style={{ background: '#f2f4f7', border: 'none', borderRadius: 4, width: 32, height: 32, fontWeight: 700, fontSize: 18, cursor: item.quantity > 1 ? 'pointer' : 'not-allowed', color: '#42546e' }} disabled={item.quantity <= 1}>-</button>
                  <span style={{ fontWeight: 600, fontSize: 17, minWidth: 24, textAlign: 'center' }}>{item.quantity || 1}</span>
                  <button onClick={() => updateQuantity(item._id, 1)} style={{ background: '#f2f4f7', border: 'none', borderRadius: 4, width: 32, height: 32, fontWeight: 700, fontSize: 18, cursor: item.quantity >= (item.stock || 1) ? 'not-allowed' : 'pointer', color: '#42546e' }} disabled={item.quantity >= (item.stock || 1)}>+</button>
                </div>
                <button onClick={() => removeFromCart(item._id)} style={{ background: 'none', border: 'none', color: '#e74c3c', fontWeight: 600, marginTop: 0, cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 18, display: 'inline-block', marginRight: 2 }}>🗑️</span> Remove
                </button>
              </div>
            </div>
          ))}
        </div>
        {/* Footer */}
        <div className="cart-footer" style={{
          borderTop: '1px solid #ededed',
          background: '#fafbfc',
          marginTop: 'auto',
          padding: '24px',
          position: 'sticky',
          bottom: 0,
          zIndex: 2,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: 20, marginBottom: 18 }}>
            <span>Subtotal:</span>
            <span style={{ color: '#222' }}>ETB {total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
          </div>
          <button 
            disabled={cart.length === 0}
            onClick={cart.length > 0 ? handleCheckout : undefined}
            style={{ 
              background: '#e74c3c', 
              color: '#fff', 
              border: 'none', 
              borderRadius: 8, 
              padding: '1rem 0', 
              fontWeight: 700, 
              fontSize: 18, 
              width: '100%', 
              cursor: cart.length === 0 ? 'not-allowed' : 'pointer', 
              opacity: cart.length === 0 ? 0.85 : 1, 
              letterSpacing: 0.2 
            }}
          >
            Proceed to Checkout
          </button>
          <button className="button" onClick={placeOrder} disabled={cart.length === 0} style={{marginTop:16}}>
            Place Order
          </button>
        </div>
      </div>
    </div>
  );
};

export default Cart;
