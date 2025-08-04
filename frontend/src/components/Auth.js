import React, { useState } from 'react';
import axios from 'axios';

const API_BASE = '/api/auth';

const Auth = ({ onSuccess, onSwitchToRegister, isModal }) => {
  const [formData, setFormData] = useState({ email: '', password: '', remember: false });
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({ ...formData, [name]: type === 'checkbox' ? checked : value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    try {
      const res = await axios.post(`${API_BASE}/login`, {
        email: formData.email,
        password: formData.password,
      });
      // Check user role and current path
      const userRole = res.data.user?.role || res.data.role;
      const currentPath = window.location.pathname;
      if (userRole === 'admin' && currentPath !== '/admin') {
        setMessage('Admins can only log in at /admin');
        setLoading(false);
        return;
      }
      if (userRole === 'subadmin' && currentPath !== '/subadmin') {
        setMessage('Subadmins can only log in at /subadmin');
        setLoading(false);
        return;
      }
      setMessage('Login successful!');
      // Save user object for dashboard compatibility
      const userObj = {
        _id: res.data.user?._id,
        token: res.data.token,
        role: res.data.user?.role || res.data.role,
        shopId: res.data.user?.shopId || res.data.shopId || null,
        username: res.data.user?.username || '',
        email: res.data.user?.email || formData.email
      };
      localStorage.setItem('user', JSON.stringify(userObj));
      localStorage.setItem('token', res.data.token); // Ensure token is available for header and API
      // Redirect based on role and current path
      if (userRole === 'admin' && currentPath === '/admin') {
        window.location.href = '/admin';
      } else if (userRole === 'subadmin' && currentPath === '/subadmin') {
        window.location.href = '/subadmin';
      } else {
        window.location.href = '/';
      }
      if (onSuccess) onSuccess();
    } catch (err) {
      setMessage(
        err.response?.data?.message ||
        err.response?.data?.error ||
        err.message ||
        'Login failed.'
      );
    } finally {
      setLoading(false);
    }
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
    width: 1050,
    maxWidth: '95vw',
    minWidth: 800,
    margin: '0 auto',
    background: '#fff',
    borderRadius: 24,
    boxShadow: '0 4px 32px rgba(44,62,80,0.12)',
    padding: '3.5rem 2.5rem 2.5rem 2.5rem',
    fontFamily: 'Poppins, Arial, sans-serif',
    position: 'relative',
    minHeight: 600,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
  };

  return (
    <div style={cardStyle}>
      <h2 style={{
        textAlign: 'center',
        marginBottom: '2rem',
        color: '#232946',
        fontWeight: 800,
        fontSize: '2.1em',
        letterSpacing: 1
      }}>User Login</h2>
      <form onSubmit={handleSubmit} style={{ width: '100%' }}>
        <label style={{ fontWeight: 700, color: '#333', marginBottom: 8, fontSize: '1.1em', display: 'block' }}>Email</label>
        <input
          type="email"
          name="email"
          value={formData.email}
          onChange={handleChange}
          required
          style={{
            width: '100%',
            padding: '1rem',
            borderRadius: 8,
            border: '1.5px solid #bfc9d9',
            fontSize: '1.1em',
            background: '#f8fafc',
            marginBottom: 18,
            marginTop: 0,
            boxSizing: 'border-box',
          }}
        />
        <label style={{ fontWeight: 700, color: '#333', marginBottom: 8, fontSize: '1.1em', display: 'block' }}>Password</label>
        <input
          type="password"
          name="password"
          value={formData.password}
          onChange={handleChange}
          required
          style={{
            width: '100%',
            padding: '1rem',
            borderRadius: 8,
            border: '1.5px solid #bfc9d9',
            fontSize: '1.1em',
            background: '#f8fafc',
            marginBottom: 18,
            marginTop: 0,
            boxSizing: 'border-box',
          }}
        />
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 18 }}>
          <input type="checkbox" id="remember" name="remember" checked={formData.remember} onChange={handleChange} style={{ marginRight: 10, width: 18, height: 18 }} />
          <label htmlFor="remember" style={{ fontWeight: 700, color: '#444', fontSize: '1em', letterSpacing: 0.2 }}>Remember me</label>
        </div>
        <button type="submit" style={{
          background: '#8e44ad',
          color: '#fff',
          border: 'none',
          padding: '0.9rem 0',
          borderRadius: 10,
          fontWeight: 700,
          fontSize: '1.2em',
          marginTop: 0,
          marginBottom: 18,
          cursor: loading ? 'not-allowed' : 'pointer',
          opacity: formData.email && formData.password ? 1 : 0.7,
          width: '100%',
          transition: 'background 0.2s',
          boxShadow: '0 2px 8px #f6f6f7',
        }} disabled={!formData.email || !formData.password || loading}>
          {loading ? 'Logging in...' : 'Login'}
        </button>
        {message && <div style={{ color: '#e74c3c', marginBottom: 12, textAlign: 'center', fontWeight: 600, fontSize: '1em' }}>{message}</div>}
        <div style={{ textAlign: 'center', marginTop: 0 }}>
          <button type="button" style={{ color: '#2196f3', fontWeight: 700, textDecoration: 'none', fontSize: '1em', marginBottom: 8, display: 'inline-block', background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}>Forgot password?</button>
        </div>
        <div style={{ marginTop: 10, textAlign: 'center', color: '#444', fontSize: '1em' }}>
          Don't have an account?{' '}
          <span style={{ color: '#2196f3', fontWeight: 700, cursor: 'pointer' }} onClick={onSwitchToRegister}>Register</span>
        </div>
      </form>
    </div>
  );
};

export default Auth;