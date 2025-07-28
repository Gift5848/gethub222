import React, { useState } from 'react';
import axios from 'axios';

const API_BASE = '/api/auth';

const Auth = ({ onSuccess, onSwitchToRegister }) => {
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
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('user', JSON.stringify(res.data.user));
      localStorage.setItem('userEmail', formData.email);
      window.location.href = '/';
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

  return (
    <div style={{
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
    }}>
      <h2 style={{
        textAlign: 'left',
        marginBottom: '2.5rem',
        color: '#222',
        fontWeight: 700,
        fontSize: '2.6rem',
        letterSpacing: 0.5,
        alignSelf: 'flex-start',
        marginLeft: 0,
        marginTop: 10
      }}>Login to Your Account</h2>
      <form onSubmit={handleSubmit} style={{ width: '100%', maxWidth: 900 }}>
        <label style={{ fontWeight: 700, color: '#333', marginBottom: 12, fontSize: '2rem', display: 'block' }}>Email</label>
        <input
          type="email"
          name="email"
          value={formData.email}
          onChange={handleChange}
          required
          style={{
            width: '100%',
            padding: '1.5rem',
            borderRadius: 8,
            border: '1.5px solid #e0e0e0',
            fontSize: '1.5rem',
            outline: 'none',
            background: '#fff',
            marginBottom: 48,
            marginTop: 0,
            boxSizing: 'border-box',
          }}
        />
        <label style={{ fontWeight: 700, color: '#333', marginBottom: 12, fontSize: '2rem', display: 'block' }}>Password</label>
        <input
          type="password"
          name="password"
          value={formData.password}
          onChange={handleChange}
          required
          style={{
            width: '100%',
            padding: '1.5rem',
            borderRadius: 8,
            border: '1.5px solid #e0e0e0',
            fontSize: '1.5rem',
            outline: 'none',
            background: '#fff',
            marginBottom: 48,
            marginTop: 0,
            boxSizing: 'border-box',
          }}
        />
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 48 }}>
          <input type="checkbox" id="remember" name="remember" checked={formData.remember} onChange={handleChange} style={{ marginRight: 18, width: 28, height: 28 }} />
          <label htmlFor="remember" style={{ fontWeight: 700, color: '#444', fontSize: '1.6rem', letterSpacing: 0.2 }}>Remember me</label>
        </div>
        <button type="submit" style={{
          background: '#e74c3c',
          color: '#fff',
          border: 'none',
          padding: '1.3rem 0',
          borderRadius: 10,
          fontWeight: 700,
          fontSize: '2rem',
          marginTop: 0,
          marginBottom: 48,
          cursor: loading ? 'not-allowed' : 'pointer',
          opacity: formData.email && formData.password ? 1 : 0.7,
          width: 180,
          alignSelf: 'flex-start',
          transition: 'background 0.2s',
          boxShadow: '0 2px 8px #f6f6f7',
        }} disabled={!formData.email || !formData.password || loading}>
          Login
        </button>
        {message && <div style={{ color: '#e74c3c', marginBottom: 18, textAlign: 'center', fontWeight: 600, fontSize: '1.2rem' }}>{message}</div>}
        <div style={{ textAlign: 'center', marginTop: 0 }}>
          <a href="#" style={{ color: '#2196f3', fontWeight: 700, textDecoration: 'none', fontSize: '1.35rem', marginBottom: 8, display: 'inline-block' }}>Forgot password?</a>
        </div>
        <div style={{ marginTop: 18, textAlign: 'center', color: '#444', fontSize: '1.35rem' }}>
          Don't have an account?{' '}
          <span style={{ color: '#2196f3', fontWeight: 700, cursor: 'pointer' }} onClick={onSwitchToRegister}>Register</span>
        </div>
      </form>
    </div>
  );
};

export default Auth;