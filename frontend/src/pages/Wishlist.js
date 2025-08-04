import React, { useEffect, useState } from 'react';
import axios from 'axios';

const Wishlist = ({ setCartCount }) => {
  const [wishlist, setWishlist] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const user = JSON.parse(localStorage.getItem('user'));
  const userId = user?._id || 'guest';
  const cartKey = `cart_${userId}`;

  useEffect(() => {
    setLoading(true);
    const token = localStorage.getItem('token');
    axios.get('/api/wishlist', {
      headers: token ? { Authorization: `Bearer ${token}` } : {}
    })
      .then(res => setWishlist(res.data))
      .catch(() => setError('Failed to load wishlist.'))
      .finally(() => setLoading(false));
  }, []);

  const addAllToCart = () => {
    const cart = JSON.parse(localStorage.getItem(cartKey)) || [];
    // Only add items not already in cart
    const newItems = wishlist.filter(wItem => !cart.some(cItem => cItem._id === wItem._id));
    const updatedCart = [...cart, ...newItems.map(item => ({ ...item, quantity: 1 }))];
    localStorage.setItem(cartKey, JSON.stringify(updatedCart));
    if (setCartCount) {
      setCartCount(updatedCart.reduce((sum, i) => sum + (i.quantity || 1), 0));
    }
    alert('All wishlist items added to cart!');
  };

  const addToCart = (item) => {
    const cart = JSON.parse(localStorage.getItem(cartKey)) || [];
    if (!cart.some(cItem => cItem._id === item._id)) {
      cart.push({ ...item, quantity: 1 });
      localStorage.setItem(cartKey, JSON.stringify(cart));
      if (setCartCount) {
        setCartCount(cart.reduce((sum, i) => sum + (i.quantity || 1), 0));
      }
      alert(`${item.name} added to cart!`);
    } else {
      alert(`${item.name} is already in your cart.`);
    }
  };

  const removeFromWishlist = async (id) => {
    const token = localStorage.getItem('token');
    try {
      await axios.post('/api/wishlist/remove', { productId: id }, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      setWishlist(wishlist.filter(item => item._id !== id));
    } catch {
      alert('Failed to remove item from wishlist.');
    }
  };

  const removeAllWishlist = async () => {
    const token = localStorage.getItem('token');
    try {
      await axios.post('/api/wishlist/clear', {}, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      setWishlist([]);
    } catch {
      alert('Failed to remove all items.');
    }
  };

  if (loading) return <div style={{padding: '2rem'}}><h2>Loading wishlist...</h2></div>;
  if (error) return <div style={{padding: '2rem'}}><h2>{error}</h2></div>;
  if (wishlist.length === 0) return <div style={{padding: '2rem'}}><h2>Your wishlist is empty.</h2></div>;

  return (
    <div style={{maxWidth: 800, margin: '2rem auto', background: '#fff', borderRadius: 8, boxShadow: '0 2px 8px #eee', padding: 24}}>
      <h2>Your Wishlist</h2>
      <div style={{marginBottom: 16}}>
        <button onClick={addAllToCart} style={{marginRight: 12, background: '#27ae60', color: '#fff', border: 'none', borderRadius: 4, padding: '8px 18px', cursor: 'pointer'}}>Add All to Cart</button>
        <button onClick={removeAllWishlist} style={{background: '#e74c3c', color: '#fff', border: 'none', borderRadius: 4, padding: '8px 18px', cursor: 'pointer'}}>Remove All</button>
      </div>
      <ul style={{listStyle: 'none', padding: 0}}>
        {wishlist.map(item => (
          <li key={item._id} style={{marginBottom: 16, borderBottom: '1px solid #eee', paddingBottom: 8}}>
            <div style={{display: 'flex', alignItems: 'center'}}>
              {item.image && (
                <img src={item.image} alt={item.name} style={{width: 60, height: 60, objectFit: 'cover', borderRadius: 4, marginRight: 16}} />
              )}
              <div style={{flex: 1}}>
                <strong>{item.name}</strong><br />
                <span>Price: ${item.price}</span>
              </div>
              <button onClick={() => addToCart(item)} style={{marginLeft: 8, background: '#27ae60', color: '#fff', border: 'none', borderRadius: 4, padding: '6px 14px', cursor: 'pointer'}}>Add to Cart</button>
              <button onClick={() => removeFromWishlist(item._id)} style={{marginLeft: 8, background: '#e67e22', color: '#fff', border: 'none', borderRadius: 4, padding: '6px 14px', cursor: 'pointer'}}>Remove</button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default Wishlist;
