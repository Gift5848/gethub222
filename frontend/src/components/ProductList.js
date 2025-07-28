import React, { useEffect, useState } from 'react';
import axios from 'axios';
import Header from './Header';

const ProductList = ({ filters = {}, searchTrigger, onAddToCart, onCartCountChange }) => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [sort, setSort] = useState('popular');
  const [category, setCategory] = useState('all');
  const [cartCount, setCartCount] = useState(() => {
    const cart = JSON.parse(localStorage.getItem('cart')) || [];
    return cart.reduce((sum, item) => sum + (item.quantity || 1), 0);
  });
  // Get user role from localStorage (assumes user info is stored after login)
  const [userRole, setUserRole] = useState('');
  useEffect(() => {
    try {
      const user = JSON.parse(localStorage.getItem('user'));
      setUserRole(user?.role || '');
    } catch {
      setUserRole('');
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    setError(null);
    // Build query params for backend filtering
    const params = {};
    if (filters.make) params.make = filters.make;
    if (filters.model) params.model = filters.model;
    if (filters.year) params.year = filters.year;
    if (filters.search) params.search = filters.search;
    axios.get('/api/products', { params })
      .then(res => setProducts(res.data))
      .catch(err => setError('Failed to load products.'))
      .finally(() => setLoading(false));
  }, [filters, searchTrigger]);

  useEffect(() => {
    if (onCartCountChange) onCartCountChange(cartCount);
  }, [cartCount, onCartCountChange]);

  // Demo categories for dropdown
  const categories = ['All Categories', 'Engine Parts', 'Brake System', 'Cooling System', 'Lighting'];

  // Demo sort options
  const sortOptions = [
    { value: 'popular', label: 'Most Popular' },
    { value: 'priceLow', label: 'Price: Low to High' },
    { value: 'priceHigh', label: 'Price: High to Low' },
    { value: 'newest', label: 'Newest' },
  ];

  // Filter and sort products for demo (replace with backend sort/filter if available)
  let filtered = products;
  if (category !== 'all' && category !== 'All Categories') {
    filtered = filtered.filter(p => (p.category || '').toLowerCase().includes(category.toLowerCase()));
  }
  if (sort === 'priceLow') filtered = [...filtered].sort((a, b) => a.price - b.price);
  if (sort === 'priceHigh') filtered = [...filtered].sort((a, b) => b.price - a.price);
  if (sort === 'newest') filtered = [...filtered].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  const updateCartCount = () => {
    const cart = JSON.parse(localStorage.getItem('cart')) || [];
    setCartCount(cart.reduce((sum, item) => sum + (item.quantity || 1), 0));
  };

  const addToCart = (product) => {
    let cart = JSON.parse(localStorage.getItem('cart')) || [];
    const existing = cart.find(item => item._id === product._id);
    // Only add if stock allows
    if (existing) {
      if (existing.quantity < product.stock) {
        existing.quantity = (existing.quantity || 1) + 1;
      } else {
        // Optionally show a message: max stock reached
        return;
      }
    } else {
      if (product.stock > 0) {
        cart.push({ ...product, quantity: 1 });
      } else {
        // Optionally show a message: out of stock
        return;
      }
    }
    cart = cart.map(item => ({ ...item, quantity: item.quantity || 1 }));
    localStorage.setItem('cart', JSON.stringify(cart));
    updateCartCount();
    if (onAddToCart) onAddToCart();
  };

  // Details modal state
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [showDetails, setShowDetails] = useState(false);

  const handleDetails = async (product) => {
    try {
      const res = await axios.get(`/api/products/${product._id}`);
      setSelectedProduct(res.data);
      setShowDetails(true);
    } catch (err) {
      setSelectedProduct(product); // fallback to local data
      setShowDetails(true);
    }
  };
  const closeDetails = () => {
    setShowDetails(false);
    setSelectedProduct(null);
  };

  // Chat modal state
  const [showChat, setShowChat] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatText, setChatText] = useState('');
  const [chatFile, setChatFile] = useState(null);
  const [chatLoading, setChatLoading] = useState(false);

  // Fetch chat messages for selected product
  const fetchChatMessages = async (productId) => {
    setChatLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`/api/messages?productId=${productId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setChatMessages(res.data);
    } catch (err) {
      setChatMessages([]);
    }
    setChatLoading(false);
  };

  const handleOpenChat = async () => {
    if (selectedProduct?._id) await fetchChatMessages(selectedProduct._id);
    setShowChat(true);
  };
  // Chat file upload logic
  const handleSendChat = async () => {
    if (!chatText.trim() && !chatFile) return;
    setChatLoading(true);
    try {
      const token = localStorage.getItem('token');
      const formData = new FormData();
      formData.append('productId', selectedProduct._id);
      formData.append('text', chatText);
      if (chatFile) formData.append('file', chatFile);
      await axios.post('/api/messages/upload', formData, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' }
      });
      setChatText('');
      setChatFile(null);
      await fetchChatMessages(selectedProduct._id);
    } catch (err) {}
    setChatLoading(false);
  };

  // Wishlist logic using backend
  const handleAddToWishlist = async (product) => {
    try {
      const token = localStorage.getItem('token');
      await axios.post('/api/wishlist/add', { productId: product._id }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      alert('Added to wishlist!');
    } catch {
      alert('Failed to add to wishlist.');
    }
  };
  const handleRemoveFromWishlist = async (product) => {
    try {
      const token = localStorage.getItem('token');
      await axios.post('/api/wishlist/remove', { productId: product._id }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      alert('Removed from wishlist!');
    } catch {
      alert('Failed to remove from wishlist.');
    }
  };

  return (
    <>
      
       
      <section className="products" id="products" style={{ background: '#f6f6f7', padding: '60px 0 40px', minHeight: 600, width: '100vw', position: 'relative', left: '50%', right: '50%', marginLeft: '-50vw', marginRight: '-50vw' }}>
        <div className="container" style={{ maxWidth: '100vw', width: '100vw', margin: '0 auto', padding: '0 2vw' }}>
          <h2 className="section-title" style={{ fontWeight: 700, fontSize: 36, color: '#2c3e50', margin: 0, letterSpacing: 0.5, textAlign: 'center' }}>
            Featured Products
            <div style={{ width: 60, height: 4, background: '#e74c3c', borderRadius: 2, margin: '16px auto 0', display: 'block' }}></div>
          </h2>
          <div className="product-filters" style={{ display: 'flex', justifyContent: 'center', gap: 32, margin: '40px 0 36px', flexWrap: 'wrap' }}>
            <div className="filter-group" style={{ minWidth: 220, fontWeight: 700, fontSize: 16, background: '#fff', borderRadius: 12, boxShadow: '0 2px 12px #eaeaea', padding: 14, display: 'flex', alignItems: 'center', gap: 10 }}>
              <label htmlFor="sort-by" style={{ fontWeight: 700, marginRight: 8, fontSize: 15 }}>Sort by:</label>
              <select id="sort-by" value={sort} onChange={e => setSort(e.target.value)} style={{ padding: 8, borderRadius: 8, border: '1.5px solid #ddd', minWidth: 110, fontSize: 14, fontWeight: 500, boxShadow: '0 2px 8px #f6f6f7' }}>
                {sortOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
              </select>
            </div>
            <div className="filter-group" style={{ minWidth: 220, fontWeight: 700, fontSize: 16, background: '#fff', borderRadius: 12, boxShadow: '0 2px 12px #eaeaea', padding: 14, display: 'flex', alignItems: 'center', gap: 10 }}>
              <label htmlFor="category-filter" style={{ fontWeight: 700, marginRight: 8, fontSize: 15 }}>Category:</label>
              <select id="category-filter" value={category} onChange={e => setCategory(e.target.value)} style={{ padding: 8, borderRadius: 8, border: '1.5px solid #ddd', minWidth: 110, fontSize: 14, fontWeight: 500, boxShadow: '0 2px 8px #f6f6f7' }}>
                {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
              </select>
            </div>
          </div>
          <div className="product-grid" id="product-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(390px, 1fr))', gap: 36, width: '100vw', padding: '0 2vw' }}>
            {loading && <div>Loading products...</div>}
            {error && <div style={{color: 'red'}}>{error}</div>}
            {!loading && !error && filtered.length === 0 && (
              <div style={{ gridColumn: '1/-1', textAlign: 'center', color: '#888', fontSize: 22, padding: '60px 0' }}>
                No products found.
              </div>
            )}
            {!loading && !error && filtered.map(product => (
              <div className="product-card" key={product._id} style={{ background: '#fff', borderRadius: 18, boxShadow: '0 4px 16px rgba(44,62,80,0.08)', padding: 0, overflow: 'hidden', position: 'relative', display: 'flex', flexDirection: 'column', minHeight: 480 }}>
                <div className="product-badge" style={{ position: 'absolute', top: 14, left: 14, background: '#e74c3c', color: '#fff', fontWeight: 700, fontSize: 13, borderRadius: 7, padding: '3px 12px', zIndex: 2 }}>New</div>
                <div className="product-image">
                  {product.image && (
                    <img src={
                      product.image
                        ? product.image.startsWith('http')
                          ? product.image
                          : product.image.startsWith('/uploads/')
                            ? `http://localhost:5000${product.image}`
                            : `http://localhost:5000/uploads/${product.image}`
                        : '/default-product.png'
                    } alt={product.name} loading="lazy" style={{ width: '100%', height: 170, objectFit: 'cover', borderTopLeftRadius: 18, borderTopRightRadius: 18, background: '#f8f8f8' }} />
                  )}
                </div>
                <div className="product-info" style={{ padding: '20px 20px 16px', flex: 1, display: 'flex', flexDirection: 'column' }}>
                  <span className="product-category" style={{ color: '#2980ef', fontWeight: 700, fontSize: 13, marginBottom: 2 }}>{product.category || 'Engine Parts'}</span>
                  <h3 className="product-title" style={{ fontWeight: 700, fontSize: 18, color: '#223', marginBottom: 6 }}>{product.name}</h3>
                  <p className="product-description" style={{ color: '#666', fontSize: 13, marginBottom: 10, minHeight: 28, maxHeight: 28, overflow: 'hidden', textOverflow: 'ellipsis' }}>{product.description || product.desc}</p>
                  <div className="product-meta" style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                    <div className="product-price" style={{ fontWeight: 700, fontSize: 16, color: '#e74c3c' }}>ETB {product.price?.toLocaleString()}</div>
                    {product.stock > 5 && (
                      <div className="product-stock in-stock" style={{ background: '#27ae60', color: '#fff', fontWeight: 600, fontSize: 12, borderRadius: 8, padding: '3px 10px' }}>In Stock</div>
                    )}
                    {product.stock > 0 && product.stock <= 5 && (
                      <div className="product-stock low-stock" style={{ background: '#f7c948', color: '#fff', fontWeight: 600, fontSize: 12, borderRadius: 8, padding: '3px 10px' }}>Low Stock ({product.stock})</div>
                    )}
                    {(product.stock === 0 || product.stock === undefined || product.stock === null) && (
                      <div className="product-stock out-stock" style={{ background: '#e74c3c', color: '#fff', fontWeight: 600, fontSize: 12, borderRadius: 8, padding: '3px 10px' }}>Out of Stock</div>
                    )}
                  </div>
                  <div className="product-actions" style={{ display: 'flex', gap: 8, marginTop: 'auto' }}>
                    <button className="btn btn-outline view-details" onClick={() => handleDetails(product)} style={{ background: '#fff', color: '#e74c3c', border: '2px solid #e74c3c', borderRadius: 8, padding: '8px 18px', fontWeight: 700, fontSize: 14, cursor: 'pointer', transition: 'background 0.2s', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <i className="fas fa-info-circle" style={{ fontSize: 16 }}></i> Details
                    </button>
                    {/* Only show Add to Cart for shop products */}
                    {product.shopId ? (
                      <button 
                        className="btn btn-primary add-to-cart"
                        onClick={e => { e.stopPropagation(); addToCart(product); }}
                        disabled={!product.stock || product.stock === 0}
                        style={{ background: (!product.stock || product.stock === 0) ? '#f6f6f7' : '#e74c3c', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 18px', fontWeight: 700, fontSize: 14, cursor: (!product.stock || product.stock === 0) ? 'not-allowed' : 'pointer', opacity: (!product.stock || product.stock === 0) ? 0.7 : 1, display: 'flex', alignItems: 'center', gap: 6 }}
                      >
                        <i className="fas fa-cart-plus" style={{ fontSize: 16 }}></i> Add to Cart
                      </button>
                    ) : null}
                    {/* Wishlist Button */}
                    <button className="btn btn-outline" style={{ background: '#fff', color: '#3a6cf6', border: '2px solid #3a6cf6', borderRadius: 8, padding: '8px 18px', fontWeight: 700, fontSize: 14, cursor: 'pointer', transition: 'background 0.2s', display: 'flex', alignItems: 'center', gap: 6 }} onClick={() => handleAddToWishlist(product)}>
                      <i className="fas fa-heart" style={{ fontSize: 16 }}></i> Wishlist
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="load-more" style={{ display: 'flex', justifyContent: 'center', marginTop: 40 }}>
            <button className="btn btn-outline" id="load-more-btn" style={{ background: '#fff', color: '#e74c3c', border: '2px solid #e74c3c', borderRadius: 9, padding: '13px 38px', fontWeight: 700, fontSize: 18, cursor: 'pointer', boxShadow: '0 2px 8px #f6f6f7', marginTop: 8 }}>
              Load More Products
            </button>
          </div>
        </div>
      </section>

      {/* Product Details Modal */}
      {showDetails && selectedProduct && (
        <div className="product-details-modal" style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(44,62,80,0.18)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#fff', borderRadius: 18, boxShadow: '0 8px 32px rgba(44,62,80,0.18)', padding: 24, minWidth: 320, maxWidth: 420, width: '90vw', position: 'relative' }}>
            <button onClick={closeDetails} style={{ position: 'absolute', top: 12, right: 12, background: 'none', border: 'none', fontSize: 20, color: '#e74c3c', cursor: 'pointer', fontWeight: 700 }}>&times;</button>
            <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap' }}>
              <div style={{ flex: '1 1 120px', minWidth: 120 }}>
                <img src={
                  selectedProduct.image
                    ? selectedProduct.image.startsWith('http')
                      ? selectedProduct.image
                      : selectedProduct.image.startsWith('/uploads/')
                        ? `http://localhost:5000${selectedProduct.image}`
                        : `http://localhost:5000/uploads/${selectedProduct.image}`
                    : '/default-product.png'
                } alt={selectedProduct.name} style={{ width: '100%', height: 120, objectFit: 'cover', borderRadius: 10, background: '#f8f8f8' }} />
              </div>
              <div style={{ flex: '2 1 180px', minWidth: 120 }}>
                <h2 style={{ fontWeight: 700, fontSize: 18, color: '#223', marginBottom: 6 }}>{selectedProduct.name}</h2>
                <div style={{ color: '#2980ef', fontWeight: 700, fontSize: 13, marginBottom: 6 }}>{selectedProduct.category || 'Engine Parts'}</div>
                <div style={{ fontWeight: 700, fontSize: 15, color: '#e74c3c', marginBottom: 8 }}>ETB {selectedProduct.price?.toLocaleString()}</div>
                <div style={{ color: '#666', fontSize: 13, marginBottom: 10 }}>{selectedProduct.description || selectedProduct.desc}</div>
                <div style={{ marginBottom: 10 }}>
                  {selectedProduct.stock > 5 && <span style={{ background: '#27ae60', color: '#fff', fontWeight: 600, fontSize: 11, borderRadius: 8, padding: '3px 10px' }}>In Stock</span>}
                  {selectedProduct.stock > 0 && selectedProduct.stock <= 5 && <span style={{ background: '#f7c948', color: '#fff', fontWeight: 600, fontSize: 11, borderRadius: 8, padding: '3px 10px' }}>Low Stock ({selectedProduct.stock})</span>}
                  {(!selectedProduct.stock || selectedProduct.stock === 0) && <span style={{ background: '#e74c3c', color: '#fff', fontWeight: 600, fontSize: 11, borderRadius: 8, padding: '3px 10px' }}>Out of Stock</span>}
                </div>
                {/* Seller Info */}
                <div style={{ marginBottom: 10, marginTop: 10, padding: '10px', background: '#f6f6f7', borderRadius: 8 }}>
                  <div><b>Seller Name:</b> {selectedProduct.sellerName || selectedProduct.owner?.username || 'N/A'}</div>
                  <div><b>Phone:</b> {selectedProduct.sellerPhone || selectedProduct.owner?.phone || 'N/A'}
                    {selectedProduct.sellerPhone || selectedProduct.owner?.phone ? (
                      <>
                        <button style={{marginLeft:8, fontSize:12, padding:'2px 8px', borderRadius:6, background:'#3a6cf6', color:'#fff', border:'none', cursor:'pointer'}} onClick={() => window.open(`tel:${selectedProduct.sellerPhone || selectedProduct.owner?.phone}`)}>Call Seller</button>
                        <button style={{marginLeft:4, fontSize:12, padding:'2px 8px', borderRadius:6, background:'#f7c948', color:'#222', border:'none', cursor:'pointer'}} onClick={() => {navigator.clipboard.writeText(selectedProduct.sellerPhone || selectedProduct.owner?.phone)}}>Copy Phone</button>
                      </>
                    ) : null}
                  </div>
                  <div><b>Email:</b> {selectedProduct.sellerEmail || selectedProduct.owner?.email || 'N/A'}
                    {selectedProduct.sellerEmail || selectedProduct.owner?.email ? (
                      <button style={{marginLeft:8, fontSize:12, padding:'2px 8px', borderRadius:6, background:'#f7c948', color:'#222', border:'none', cursor:'pointer'}} onClick={() => {navigator.clipboard.writeText(selectedProduct.sellerEmail || selectedProduct.owner?.email)}}>Copy Email</button>
                    ) : null}
                  </div>
                </div>
                {/* Chat Button: only for user-to-user products */}
                {!selectedProduct.shopId && (
                  <button className="btn btn-outline" style={{marginTop:8, marginBottom:8, background:'#3a6cf6', color:'#fff', border:'none', borderRadius:8, padding:'8px 18px', fontWeight:700, fontSize:14, cursor:'pointer'}} onClick={handleOpenChat}>Chat with Seller</button>
                )}
                {/* Only show Add to Cart for shop products in modal */}
                {selectedProduct.shopId ? (
                  <button 
                    className="btn btn-primary add-to-cart"
                    onClick={() => { addToCart(selectedProduct); closeDetails(); }}
                    disabled={!selectedProduct.stock || selectedProduct.stock === 0}
                    style={{ background: (!selectedProduct.stock || selectedProduct.stock === 0) ? '#f6f6f7' : '#e74c3c', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 18px', fontWeight: 700, fontSize: 14, cursor: (!selectedProduct.stock || selectedProduct.stock === 0) ? 'not-allowed' : 'pointer', opacity: (!selectedProduct.stock || selectedProduct.stock === 0) ? 0.7 : 1, display: 'flex', alignItems: 'center', gap: 6 }}
                  >
                    <i className="fas fa-cart-plus" style={{ fontSize: 14 }}></i> Add to Cart
                  </button>
                ) : null}
                {/* Wishlist Button in modal */}
                <button className="btn btn-outline" style={{marginTop:8, marginBottom:8, background:'#fff', color:'#3a6cf6', border:'2px solid #3a6cf6', borderRadius:8, padding:'8px 18px', fontWeight:700, fontSize:14, cursor:'pointer'}} onClick={() => handleAddToWishlist(selectedProduct)}>
                  <i className="fas fa-heart" style={{ fontSize: 14 }}></i> Wishlist
                </button>
              </div>
            </div>
            {/* Chat Modal: show for any user who clicks chat */}
            {showChat && (
              <div style={{position:'fixed',top:0,left:0,width:'100vw',height:'100vh',background:'#232946cc',zIndex:99999,display:'flex',alignItems:'center',justifyContent:'center'}}>
                <div style={{background:'#fff',padding:24,borderRadius:12,minWidth:340,maxWidth:400,boxShadow:'0 2px 12px #23294655',color:'#232946',display:'flex',flexDirection:'column',gap:12}}>
                  <h3 style={{marginBottom:8}}>Chat with Seller</h3>
                  <div style={{maxHeight:220,overflowY:'auto',marginBottom:8,border:'1px solid #eee',borderRadius:8,padding:8}}>
                    {chatLoading ? <div>Loading...</div> : chatMessages.length === 0 ? <div style={{color:'#888'}}>No messages yet.</div> : chatMessages.map((msg,i) => (
                      <div key={i} style={{marginBottom:6}}>
                        <b>{msg.from?.username || 'You'}:</b> {msg.text}
                        {msg.fileUrl && (
                          <div style={{marginTop:4}}>
                            {msg.fileUrl.match(/\.(jpg|jpeg|png|gif)$/i) ? (
                              <img src={msg.fileUrl} alt="file" style={{maxWidth:120, borderRadius:8}} />
                            ) : (
                              <a href={msg.fileUrl} target="_blank" rel="noopener noreferrer">Download File</a>
                            )}
                          </div>
                        )}
                        <div style={{fontSize:11,color:'#888'}}>{new Date(msg.createdAt).toLocaleString()}</div>
                      </div>
                    ))}
                  </div>
                  <div style={{display:'flex',gap:8,alignItems:'center'}}>
                    <input type="file" accept="image/*,.pdf,.doc,.docx,.txt" onChange={e => setChatFile(e.target.files[0])} style={{flex:1}} />
                    <input type="text" value={chatText} onChange={e=>setChatText(e.target.value)} placeholder="Type your message..." style={{flex:2,padding:8,borderRadius:8,border:'1px solid #ccc'}} />
                    <button className="btn btn-primary" onClick={handleSendChat} disabled={chatLoading || (!chatText.trim() && !chatFile)} style={{padding:'8px 16px',borderRadius:8}}>Send</button>
                  </div>
                  <button className="btn btn-outline" onClick={()=>setShowChat(false)} style={{marginTop:8}}>Close</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default ProductList;
