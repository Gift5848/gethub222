import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const Cart = ({ onClose, onCheckout, onCartCountChange }) => {
  const user = JSON.parse(localStorage.getItem('user'));
  const userId = user?._id || 'guest';
  const cartKey = `cart_${userId}`;
  const [cart, setCart] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    const fixCartSellerFields = async () => {
      let storedCart = JSON.parse(localStorage.getItem(cartKey)) || [];
      let needsUpdate = false;
      for (let i = 0; i < storedCart.length; i++) {
        const item = storedCart[i];
        if (!item.sellerId || !item.seller) {
          try {
            const res = await axios.get(`/api/products/${item._id}`);
            const productDetails = res.data;
            const sellerId = productDetails.seller?._id || productDetails.seller || productDetails.owner?._id || productDetails.owner || '';
            storedCart[i] = { ...item, sellerId, seller: sellerId };
            needsUpdate = true;
          } catch {}
        }
      }
      if (needsUpdate) {
        localStorage.setItem(cartKey, JSON.stringify(storedCart));
        setCart(storedCart);
      }
    };
    fixCartSellerFields();
    const storedCart = JSON.parse(localStorage.getItem(cartKey)) || [];
    setCart(storedCart);
    if (onCartCountChange) {
      const count = storedCart.reduce((sum, item) => sum + (item.quantity || 1), 0);
      onCartCountChange(count);
    }
  }, [cartKey, onCartCountChange]);

  useEffect(() => {
    // Listen for cart changes in other tabs/windows
    const handleStorage = (e) => {
      if (e.key === cartKey) {
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
  }, [cartKey, onCartCountChange]);

  const updateCartAndCount = (updatedCart) => {
    setCart(updatedCart);
    localStorage.setItem(cartKey, JSON.stringify(updatedCart));
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
      localStorage.setItem(cartKey, JSON.stringify(updated));
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
      navigate('/checkout');
    }
  };

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
          padding: '1rem 1.5rem',
          fontSize: 20,
          fontWeight: 700,
        }}>
          <span>Cart</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#fff', fontSize: 28, cursor: 'pointer', fontWeight: 700 }}>&times;</button>
        </div>
        {/* Cart Content */}
        <div style={{ flex: 1, padding: '1.5rem' }}>
          {(!cart || cart.length === 0) ? (
            <div style={{ textAlign: 'center', color: '#888', marginTop: 40, fontSize: 20 }}>
              Your cart is empty.
            </div>
          ) : (
            <>
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
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Cart;
