import React, { useEffect, useState } from 'react';
import axios from 'axios';

const Wishlist = () => {
  const [wishlist, setWishlist] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    setLoading(true);
    axios.get('/api/wishlist')
      .then(res => setWishlist(res.data))
      .catch(() => setError('Failed to load wishlist.'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div style={{padding: '2rem'}}><h2>Loading wishlist...</h2></div>;
  if (error) return <div style={{padding: '2rem'}}><h2>{error}</h2></div>;
  if (wishlist.length === 0) return <div style={{padding: '2rem'}}><h2>Your wishlist is empty.</h2></div>;

  return (
    <div style={{maxWidth: 800, margin: '2rem auto', background: '#fff', borderRadius: 8, boxShadow: '0 2px 8px #eee', padding: 24}}>
      <h2>Your Wishlist</h2>
      <ul style={{listStyle: 'none', padding: 0}}>
        {wishlist.map(item => (
          <li key={item._id} style={{marginBottom: 16, borderBottom: '1px solid #eee', paddingBottom: 8}}>
            <div style={{display: 'flex', alignItems: 'center'}}>
              {item.image && <img src={item.image} alt={item.name} style={{width: 60, height: 60, objectFit: 'cover', borderRadius: 4, marginRight: 16}} />}
              <div style={{flex: 1}}>
                <strong>{item.name}</strong><br/>
                <span>Price: ${item.price}</span>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default Wishlist;
