import React, { useState } from 'react';
import axios from 'axios';

const makes = ['Toyota', 'Honda', 'Ford', 'BMW', 'Mercedes'];
const models = {
  Toyota: ['Corolla', 'Camry', 'RAV4'],
  Honda: ['Civic', 'Accord', 'CR-V'],
  Ford: ['Focus', 'Fusion', 'Escape'],
  BMW: ['3 Series', '5 Series', 'X5'],
  Mercedes: ['C-Class', 'E-Class', 'GLA']
};
const years = Array.from({ length: 25 }, (_, i) => 2025 - i);
const categories = ['Engine Parts', 'Brake System', 'Cooling System', 'Lighting', 'Others'];

const ProductForm = ({ onProductAdded, user, isModal }) => {
  const [form, setForm] = useState({
    name: '',
    description: '',
    price: '',
    category: '',
    stock: '',
    make: '',
    model: '',
    year: ''
  });
  const [imageFile, setImageFile] = useState(null);
  const [message, setMessage] = useState('');
  const [paymentCode, setPaymentCode] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [showPayment, setShowPayment] = useState(false);
  // Track free post count only for user role
  const [freePostsLeft, setFreePostsLeft] = useState(user?.role === 'user' ? 3 : Infinity);
  React.useEffect(() => {
    if (user?.role !== 'user') {
      setFreePostsLeft(Infinity);
      return;
    }
    const fetchPostCount = async () => {
      const token = localStorage.getItem('token');
      if (!token) {
        setFreePostsLeft(3);
        return;
      }
      try {
        const res = await axios.get('http://localhost:5000/api/auth/me', {
          headers: { Authorization: `Bearer ${token}` }
        });
        setFreePostsLeft(3 - (res.data.postCount || 0));
      } catch {
        setFreePostsLeft(3);
      }
    };
    fetchPostCount();
  }, [user]);

  // Update freePostsLeft after each successful post
  const updateFreePosts = async () => {
    if (user?.role !== 'user') return;
    const token = localStorage.getItem('token');
    if (!token) return;
    try {
      const res = await axios.get('http://localhost:5000/api/auth/me', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setFreePostsLeft(3 - (res.data.postCount || 0));
    } catch {}
  };

  const handleChange = e => setForm({ ...form, [e.target.name]: e.target.value });
  const handleMakeChange = e => {
    setForm({ ...form, make: e.target.value, model: '' });
  };
  const handleImageChange = e => {
    setImageFile(e.target.files[0]);
  };
  const handlePayment = async () => {
    if (!paymentCode.trim()) {
      setMessage('Please enter your payment confirmation code.');
      return;
    }
    setShowPayment(false);
    // Proceed to post with paid: true
    await handleSubmitPaid();
  };
  const handleSubmitPaid = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      setMessage('You must be logged in to add products.');
      return;
    }
    try {
      const formData = new FormData();
      Object.entries(form).forEach(([key, value]) => formData.append(key, value));
      if (imageFile) formData.append('image', imageFile);
      formData.append('paid', 'true');
      formData.append('paymentMethod', paymentMethod);
      formData.append('paymentCode', paymentCode);
      await axios.post('http://localhost:5000/api/products', formData, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' }
      });
      setMessage('Product added!');
      setForm({ name: '', description: '', price: '', category: '', stock: '', make: '', model: '', year: '' });
      setImageFile(null);
      setPaymentCode('');
      setFreePostsLeft(freePostsLeft);
      if (onProductAdded) onProductAdded();
    } catch (err) {
      setMessage(err.response?.data?.error || 'Error adding product');
    }
  };
  const getToken = () => {
    // Try user prop first, then localStorage
    if (user?.token) return user.token;
    const userObj = localStorage.getItem('user');
    if (userObj) {
      try {
        const parsed = JSON.parse(userObj);
        if (parsed.token) return parsed.token;
      } catch {}
    }
    return localStorage.getItem('token');
  };
  const handleSubmit = async e => {
    e.preventDefault();
    const token = getToken();
    if (!token) {
      setMessage('You must be logged in to add products. Please log in again.');
      return;
    }
    try {
      const formData = new FormData();
      Object.entries(form).forEach(([key, value]) => formData.append(key, value));
      if (imageFile) formData.append('image', imageFile);
      const res = await axios.post('http://localhost:5000/api/products', formData, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' }
      });
      setMessage('Product added!');
      setForm({ name: '', description: '', price: '', category: '', stock: '', make: '', model: '', year: '' });
      setImageFile(null);
      updateFreePosts();
      if (onProductAdded) onProductAdded();
    } catch (err) {
      if (err.response?.data?.message === 'Invalid token.') {
        setMessage('Session expired or invalid. Please log in again.');
      } else {
        setMessage(err.response?.data?.error || 'Error adding product');
      }
    }
  };
  const handleAddProduct = (e) => {
    if (user?.role === 'user' && freePostsLeft <= 0) {
      e.preventDefault();
      setMessage('You have used all free posts. Please pay to post more items.');
      setShowPayment(true); // Open payment modal immediately
      return;
    }
    handleSubmit(e);
  };

  // Use a white card only if in modal mode, otherwise keep previous style
  const cardStyle = isModal ? {
    width: 400,
    maxWidth: '95vw',
    background: '#fff',
    borderRadius: 18,
    boxShadow: '0 4px 24px #dbeafe',
    padding: '2.5rem 2rem 2rem 2rem',
    fontFamily: 'Segoe UI, Poppins, Arial, sans-serif',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  } : {
    background: '#fff',
    borderRadius: 12,
    boxShadow: '0 2px 12px #23294622',
    padding: 24,
    color: '#232946',
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
    maxWidth: 500,
    margin: '0 auto',
    marginTop: 32,
  };

  return (
    <div style={cardStyle}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',width:'100%',maxWidth:400,marginBottom:18}}>
        <h2 style={{ textAlign: 'left', color: '#222', fontWeight: 700, fontSize: '1.5rem', letterSpacing: 0.5, margin: 0 }}>Add New Product</h2>
        {user?.role === 'user' && <div style={{fontWeight:600, color:'#3a6cf6', fontSize:16}}>Free posts left: {freePostsLeft > 0 ? freePostsLeft : 0} / 3</div>}
      </div>
      {user?.role === 'user' && freePostsLeft <= 0 && <div style={{color:'#e74c3c', marginBottom:18, fontWeight:600, fontSize:16}}>You have used all free posts. Please pay to post more items.</div>}
      <form onSubmit={handleAddProduct} encType="multipart/form-data" style={{ width: '100%', maxWidth: 400 }}>
        <label style={{ fontWeight: 700, color: '#333', marginBottom: 10, fontSize: '1rem', display: 'block' }}>Name</label>
        <input name="name" placeholder="Name" value={form.name} onChange={handleChange} required style={{ width: '100%', padding: '1rem', borderRadius: 8, border: '1.5px solid #e0e0e0', fontSize: '1rem', outline: 'none', background: '#fff', marginBottom: 24, marginTop: 0, boxSizing: 'border-box' }} />
        <label style={{ fontWeight: 700, color: '#333', marginBottom: 10, fontSize: '1rem', display: 'block' }}>Description</label>
        <input name="description" placeholder="Description" value={form.description} onChange={handleChange} style={{ width: '100%', padding: '1rem', borderRadius: 8, border: '1.5px solid #e0e0e0', fontSize: '1rem', outline: 'none', background: '#fff', marginBottom: 24, marginTop: 0, boxSizing: 'border-box' }} />
        <label style={{ fontWeight: 700, color: '#333', marginBottom: 10, fontSize: '1rem', display: 'block' }}>Price</label>
        <input name="price" type="number" placeholder="Price" value={form.price} onChange={handleChange} required style={{ width: '100%', padding: '1rem', borderRadius: 8, border: '1.5px solid #e0e0e0', fontSize: '1rem', outline: 'none', background: '#fff', marginBottom: 24, marginTop: 0, boxSizing: 'border-box' }} />
        <label style={{ fontWeight: 700, color: '#333', marginBottom: 10, fontSize: '1rem', display: 'block' }}>Category</label>
        <select name="category" value={form.category} onChange={handleChange} required style={{ width: '100%', padding: '1rem', borderRadius: 8, border: '1.5px solid #e0e0e0', fontSize: '1rem', outline: 'none', background: '#fff', marginBottom: 24, marginTop: 0, boxSizing: 'border-box' }}>
          <option value="">Select Category</option>
          {categories.map(cat => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>
        <label style={{ fontWeight: 700, color: '#333', marginBottom: 10, fontSize: '1rem', display: 'block' }}>Stock</label>
        <input name="stock" type="number" placeholder="Stock" value={form.stock} onChange={handleChange} style={{ width: '100%', padding: '1rem', borderRadius: 8, border: '1.5px solid #e0e0e0', fontSize: '1rem', outline: 'none', background: '#fff', marginBottom: 24, marginTop: 0, boxSizing: 'border-box' }} />
        <label style={{ fontWeight: 700, color: '#333', marginBottom: 10, fontSize: '1rem', display: 'block' }}>Make</label>
        <select name="make" value={form.make} onChange={handleMakeChange} required style={{ width: '100%', padding: '1rem', borderRadius: 8, border: '1.5px solid #e0e0e0', fontSize: '1rem', outline: 'none', background: '#fff', marginBottom: 24, marginTop: 0, boxSizing: 'border-box' }}>
          <option value="">Select Make</option>
          {makes.map(make => (
            <option key={make} value={make}>{make}</option>
          ))}
        </select>
        <label style={{ fontWeight: 700, color: '#333', marginBottom: 10, fontSize: '1rem', display: 'block' }}>Model</label>
        <select name="model" value={form.model} onChange={handleChange} required disabled={!form.make} style={{ width: '100%', padding: '1rem', borderRadius: 8, border: '1.5px solid #e0e0e0', fontSize: '1rem', outline: 'none', background: '#fff', marginBottom: 24, marginTop: 0, boxSizing: 'border-box' }}>
          <option value="">Select Model</option>
          {form.make && models[form.make].map(model => (
            <option key={model} value={model}>{model}</option>
          ))}
        </select>
        <label style={{ fontWeight: 700, color: '#333', marginBottom: 10, fontSize: '1rem', display: 'block' }}>Year</label>
        <select name="year" value={form.year} onChange={handleChange} required style={{ width: '100%', padding: '1rem', borderRadius: 8, border: '1.5px solid #e0e0e0', fontSize: '1rem', outline: 'none', background: '#fff', marginBottom: 24, marginTop: 0, boxSizing: 'border-box' }}>
          <option value="">Select Year</option>
          {years.map(year => (
            <option key={year} value={year}>{year}</option>
          ))}
        </select>
        <label style={{ fontWeight: 700, color: '#333', marginBottom: 10, fontSize: '1rem', display: 'block' }}>Image</label>
        <input type="file" accept="image/*" onChange={handleImageChange} style={{ marginBottom: 24 }} />
        <button type="submit" style={{ background: '#e74c3c', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, fontSize: '1.1rem', marginTop: 0, marginBottom: 24, cursor: 'pointer', width: 180, alignSelf: 'flex-start', transition: 'background 0.2s' }}>Add Product</button>
        {message && <div style={{ color: '#e74c3c', marginBottom: 18, textAlign: 'center', fontWeight: 600, fontSize: '1rem' }}>{message}</div>}
      </form>
      {showPayment && (
  <div style={{position:'fixed',top:0,left:0,width:'100vw',height:'100vh',background:'rgba(44,62,80,0.18)',zIndex:2200,display:'flex',alignItems:'center',justifyContent:'center'}}>
    <div style={{background:'#fff',padding:24,borderRadius:12,minWidth:340,maxWidth:400,boxShadow:'0 2px 12px #23294655',color:'#232946',display:'flex',flexDirection:'column',gap:12}}>
      <h3 style={{marginBottom:8}}>Payment Required</h3>
      <div style={{marginBottom:8}}>You have used all free posts. Please pay 10 birr via Telebirr or CBE to post more items.</div>
      <select value={paymentMethod} onChange={e=>setPaymentMethod(e.target.value)} style={{marginBottom:8,padding:8,borderRadius:8,border:'1px solid #ccc'}}>
        <option value="">Select Payment Method</option>
        <option value="Telebirr">Telebirr</option>
        <option value="CBE">CBE</option>
      </select>
      <input type="text" value={paymentCode} onChange={e=>setPaymentCode(e.target.value)} placeholder="Enter payment confirmation code" style={{marginBottom:8,padding:8,borderRadius:8,border:'1px solid #ccc'}} />
      <button className="btn btn-primary" onClick={handlePayment} style={{padding:'8px 16px',borderRadius:8}}>Submit Payment & Post</button>
      <button className="btn btn-outline" onClick={()=>setShowPayment(false)} style={{marginTop:8}}>Cancel</button>
    </div>
  </div>
)}
    </div>
  );
};

export default ProductForm;
