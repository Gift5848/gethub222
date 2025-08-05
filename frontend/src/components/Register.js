import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API_BASE = '/api/auth';
const GOOGLE_MAPS_API_KEY = 'AIzaSyB8pbLVvoAFEkVCXyOiasOYZ36YEmdJwpU';

const Register = ({ onSuccess, onSwitchToLogin, isModal }) => {
  const [registerType, setRegisterType] = useState('buyer'); // 'buyer' or 'shop'
  // Buyer (normal user) form
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    city: '',
    terms: false
  });
  // Shop (subadmin) form
  const [shopData, setShopData] = useState({
    shopName: '',
    licenseCertificate: null, // file
    tin: '',
    location: '', // coordinates
    address: '', // human-readable address
    owner: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    terms: false
  });
  const [mapLoaded, setMapLoaded] = useState(false);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (registerType === 'shop') {
      if (!window.google) {
        const script = document.createElement('script');
        script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}`;
        script.async = true;
        script.onload = () => setMapLoaded(true);
        document.body.appendChild(script);
      } else {
        setMapLoaded(true);
      }
    }
  }, [registerType]);

  useEffect(() => {
    if (registerType === 'shop' && mapLoaded) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const { latitude, longitude } = pos.coords;
          initMap(latitude, longitude);
        },
        () => {
          initMap(9.03, 38.74);
        }
      );
    }
    // eslint-disable-next-line
  }, [registerType, mapLoaded]);

  function initMap(lat, lng) {
    const map = new window.google.maps.Map(document.getElementById('shop-map'), {
      center: { lat, lng },
      zoom: 15,
    });
    const marker = new window.google.maps.Marker({
      position: { lat, lng },
      map,
      draggable: true,
    });
    setShopData((prev) => ({ ...prev, location: `${lat},${lng}` }));
    getAddressFromLatLng(lat, lng);
    marker.addListener('dragend', function (e) {
      setShopData((prev) => ({ ...prev, location: `${e.latLng.lat()},${e.latLng.lng()}` }));
      getAddressFromLatLng(e.latLng.lat(), e.latLng.lng());
    });
  }

  function getAddressFromLatLng(lat, lng) {
    const geocoder = new window.google.maps.Geocoder();
    geocoder.geocode({ location: { lat, lng } }, (results, status) => {
      if (status === 'OK' && results[0]) {
        setShopData((prev) => ({ ...prev, address: results[0].formatted_address }));
      } else {
        setShopData((prev) => ({ ...prev, address: '' }));
      }
    });
  }

  const handleChange = (e) => {
    const { name, value, type, checked, files } = e.target;
    if (registerType === 'buyer') {
      setFormData({ ...formData, [name]: type === 'checkbox' ? checked : value });
    } else {
      if (name === 'licenseCertificate') {
        setShopData({ ...shopData, licenseCertificate: files[0] });
      } else {
        setShopData({ ...shopData, [name]: type === 'checkbox' ? checked : value });
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    if (registerType === 'buyer') {
      if (!formData.terms) {
        setMessage('You must agree to the terms.');
        setLoading(false);
        return;
      }
      if (formData.password !== formData.confirmPassword) {
        setMessage('Passwords do not match.');
        setLoading(false);
        return;
      }
      try {
        await axios.post(`${API_BASE}/register`, formData);
        setMessage('Registration successful! You can now log in.');
        if (onSuccess) onSuccess();
      } catch (err) {
        setMessage(
          err.response?.data?.message ||
          err.response?.data?.error ||
          err.message ||
          'Registration failed.'
        );
      } finally {
        setLoading(false);
      }
    } else {
      // Shop registration
      if (!shopData.terms) {
        setMessage('You must agree to the terms.');
        setLoading(false);
        return;
      }
      if (shopData.password !== shopData.confirmPassword) {
        setMessage('Passwords do not match.');
        setLoading(false);
        return;
      }
      // Basic validation
      if (!shopData.shopName || !shopData.licenseCertificate || !shopData.tin || !shopData.address || !shopData.owner || !shopData.email || !shopData.phone) {
        setMessage('Please fill in all required fields and upload the license certificate.');
        setLoading(false);
        return;
      }
      try {
        const formDataObj = new FormData();
        Object.entries(shopData).forEach(([key, value]) => {
          if (key === 'licenseCertificate' && value) {
            formDataObj.append('licenseCertificate', value);
          } else {
            formDataObj.append(key, value);
          }
        });
        await axios.post(`${API_BASE}/register-shop`, formDataObj, { headers: { 'Content-Type': 'multipart/form-data' } });
        setMessage('Shop registration submitted! Your request will be reviewed by the admin.');
        setShopData({
          shopName: '', licenseCertificate: null, tin: '', location: '', address: '', owner: '', email: '', phone: '', password: '', confirmPassword: '', terms: false
        });
      } catch (err) {
        setMessage(
          err.response?.data?.message ||
          err.response?.data?.error ||
          err.message ||
          'Shop registration failed.'
        );
      } finally {
        setLoading(false);
      }
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
      <img src="/mekina-mart-logo.png.png" alt="Mekina Mart Logo" style={{ height: 70, marginBottom: 18, marginTop: -10 }} />
      <h2 style={{
        textAlign: 'left',
        marginBottom: '2.5rem',
        color: '#222',
        fontWeight: 700,
        fontSize: '2.2rem',
        letterSpacing: 0.5,
        alignSelf: 'flex-start',
        marginLeft: 0,
        marginTop: 10
      }}>Create an Account</h2>
      {/* Register type selector */}
      <div style={{ display: 'flex', gap: 24, marginBottom: 36 }}>
        <button type="button" className={registerType === 'buyer' ? 'btn btn-primary' : 'btn btn-outline'} style={{ minWidth: 180 }} onClick={() => setRegisterType('buyer')}>Register as Buyer</button>
        <button type="button" className={registerType === 'shop' ? 'btn btn-primary' : 'btn btn-outline'} style={{ minWidth: 180 }} onClick={() => setRegisterType('shop')}>Register as Shop</button>
      </div>
      {registerType === 'buyer' ? (
        <form onSubmit={handleSubmit} style={{ width: '100%', maxWidth: 900 }}>
          <label style={{ fontWeight: 700, color: '#333', marginBottom: 12, fontSize: '1.25rem', display: 'block' }}>Full Name</label>
          <input
            type="text"
            name="username"
            value={formData.username}
            onChange={handleChange}
            required
            style={{
              width: '100%',
              padding: '1.2rem',
              borderRadius: 8,
              border: '1.5px solid #e0e0e0',
              fontSize: '1.15rem',
              outline: 'none',
              background: '#fff',
              marginBottom: 32,
              marginTop: 0,
              boxSizing: 'border-box',
            }}
          />
          <label style={{ fontWeight: 700, color: '#333', marginBottom: 12, fontSize: '1.25rem', display: 'block' }}>Email</label>
          <input
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            required
            style={{
              width: '100%',
              padding: '1.2rem',
              borderRadius: 8,
              border: '1.5px solid #e0e0e0',
              fontSize: '1.15rem',
              outline: 'none',
              background: '#fff',
              marginBottom: 32,
              marginTop: 0,
              boxSizing: 'border-box',
            }}
          />
          <label style={{ fontWeight: 700, color: '#333', marginBottom: 12, fontSize: '1.25rem', display: 'block' }}>Phone Number</label>
          <input
            type="text"
            name="phone"
            value={formData.phone}
            onChange={handleChange}
            required
            style={{
              width: '100%',
              padding: '1.2rem',
              borderRadius: 8,
              border: '1.5px solid #e0e0e0',
              fontSize: '1.15rem',
              outline: 'none',
              background: '#fff',
              marginBottom: 32,
              marginTop: 0,
              boxSizing: 'border-box',
            }}
          />
          <label style={{ fontWeight: 700, color: '#333', marginBottom: 12, fontSize: '1.25rem', display: 'block' }}>Password</label>
          <input
            type="password"
            name="password"
            value={formData.password}
            onChange={handleChange}
            required
            style={{
              width: '100%',
              padding: '1.2rem',
              borderRadius: 8,
              border: '1.5px solid #e0e0e0',
              fontSize: '1.15rem',
              outline: 'none',
              background: '#fff',
              marginBottom: 32,
              marginTop: 0,
              boxSizing: 'border-box',
            }}
          />
          <label style={{ fontWeight: 700, color: '#333', marginBottom: 12, fontSize: '1.25rem', display: 'block' }}>Confirm Password</label>
          <input
            type="password"
            name="confirmPassword"
            value={formData.confirmPassword}
            onChange={handleChange}
            required
            style={{
              width: '100%',
              padding: '1.2rem',
              borderRadius: 8,
              border: '1.5px solid #e0e0e0',
              fontSize: '1.15rem',
              outline: 'none',
              background: '#fff',
              marginBottom: 32,
              marginTop: 0,
              boxSizing: 'border-box',
            }}
          />
          <label style={{ fontWeight: 700, color: '#333', marginBottom: 12, fontSize: '1.25rem', display: 'block' }}>City</label>
          <select
            name="city"
            value={formData.city}
            onChange={handleChange}
            required
            style={{
              width: '100%',
              padding: '1.2rem',
              borderRadius: 8,
              border: '1.5px solid #e0e0e0',
              fontSize: '1.15rem',
              outline: 'none',
              background: '#fff',
              marginBottom: 32,
              marginTop: 0,
              boxSizing: 'border-box',
            }}
          >
            <option value="">Select City</option>
            <option value="Addis Ababa">Addis Ababa</option>
            <option value="Hawassa">Hawassa</option>
            <option value="DireDawa">DireDawa</option>
            <option value="Adamma">Adama</option>
            <option value="Mekelle">Mekelle</option>
            <option value="Other">Other</option>
          </select>
          <div style={{ marginBottom: 32, display: 'flex', alignItems: 'center' }}>
            <input type="checkbox" id="terms" name="terms" checked={formData.terms} onChange={handleChange} required style={{ marginRight: 12, width: 22, height: 22 }} />
            <label htmlFor="terms" style={{ fontWeight: 700, color: '#222', fontSize: '1.15rem', verticalAlign: 'middle' }}>
              I agree to the Terms of Service and Privacy Policy
            </label>
          </div>
          <button type="submit" style={{
            background: '#e74c3c',
            color: '#fff',
            border: 'none',
            padding: '1.1rem 0',
            borderRadius: 8,
            fontWeight: 700,
            fontSize: '1.25rem',
            marginTop: 0,
            marginBottom: 32,
            cursor: loading ? 'not-allowed' : 'pointer',
            opacity: formData.username && formData.email && formData.phone && formData.password && formData.confirmPassword && formData.city && formData.terms ? 1 : 0.7,
            width: 120,
            alignSelf: 'flex-start',
            transition: 'background 0.2s',
          }} disabled={!(formData.username && formData.email && formData.phone && formData.password && formData.confirmPassword && formData.city && formData.terms) || loading}>
            Register
          </button>
          {message && <div style={{ color: '#e74c3c', marginBottom: 18, textAlign: 'center', fontWeight: 600, fontSize: '1.1rem' }}>{message}</div>}
          <div style={{ marginTop: 18, textAlign: 'center', color: '#444', fontSize: '1.15rem' }}>
            Already have an account?{' '}
            <span style={{ color: '#2196f3', fontWeight: 700, cursor: 'pointer' }} onClick={onSwitchToLogin}>Login</span>
          </div>
        </form>
      ) : (
        <form onSubmit={handleSubmit} style={{ width: '100%', maxWidth: 900 }} encType="multipart/form-data">
          {/* Shop registration form */}
          <label style={{ fontWeight: 700, color: '#333', marginBottom: 12, fontSize: '1.25rem', display: 'block' }}>Shop Name</label>
          <input
            type="text"
            name="shopName"
            value={shopData.shopName}
            onChange={handleChange}
            required
            style={{
              width: '100%',
              padding: '1.2rem',
              borderRadius: 8,
              border: '1.5px solid #e0e0e0',
              fontSize: '1.15rem',
              outline: 'none',
              background: '#fff',
              marginBottom: 32,
              marginTop: 0,
              boxSizing: 'border-box',
            }}
          />
          <label style={{ fontWeight: 700, color: '#333', marginBottom: 12, fontSize: '1.25rem', display: 'block' }}>License Certificate (PDF or Image)</label>
          <input
            type="file"
            name="licenseCertificate"
            accept=".pdf,image/*"
            onChange={handleChange}
            required
            style={{
              width: '100%',
              marginBottom: 32,
              marginTop: 0,
              boxSizing: 'border-box',
            }}
          />
          <label style={{ fontWeight: 700, color: '#333', marginBottom: 12, fontSize: '1.25rem', display: 'block' }}>TIN Number</label>
          <input
            type="text"
            name="tin"
            value={shopData.tin}
            onChange={handleChange}
            required
            style={{
              width: '100%',
              padding: '1.2rem',
              borderRadius: 8,
              border: '1.5px solid #e0e0e0',
              fontSize: '1.15rem',
              outline: 'none',
              background: '#fff',
              marginBottom: 32,
              marginTop: 0,
              boxSizing: 'border-box',
            }}
          />
          <label style={{ fontWeight: 700, color: '#333', marginBottom: 12, fontSize: '1.25rem', display: 'block' }}>Shop Location (required)</label>
          <div id="shop-map" style={{width:'100%', height:300, borderRadius:8, marginBottom:8}}></div>
          <input value={shopData.address} readOnly style={{width:'100%', padding:8, borderRadius:4, background:'#f8f8f8', marginBottom:8}} placeholder="Select location on map" />
          <input value={shopData.location} readOnly style={{width:'100%', padding:8, borderRadius:4, background:'#f8f8f8'}} placeholder="Coordinates" />
          <label style={{ fontWeight: 700, color: '#333', marginBottom: 12, fontSize: '1.25rem', display: 'block' }}>Address</label>
          <input
            type="text"
            name="address"
            value={shopData.address}
            onChange={handleChange}
            required
            style={{
              width: '100%',
              padding: '1.2rem',
              borderRadius: 8,
              border: '1.5px solid #e0e0e0',
              fontSize: '1.15rem',
              outline: 'none',
              background: '#fff',
              marginBottom: 32,
              marginTop: 0,
              boxSizing: 'border-box',
            }}
          />
          <label style={{ fontWeight: 700, color: '#333', marginBottom: 12, fontSize: '1.25rem', display: 'block' }}>Owner Name</label>
          <input
            type="text"
            name="owner"
            value={shopData.owner}
            onChange={handleChange}
            required
            style={{
              width: '100%',
              padding: '1.2rem',
              borderRadius: 8,
              border: '1.5px solid #e0e0e0',
              fontSize: '1.15rem',
              outline: 'none',
              background: '#fff',
              marginBottom: 32,
              marginTop: 0,
              boxSizing: 'border-box',
            }}
          />
          <label style={{ fontWeight: 700, color: '#333', marginBottom: 12, fontSize: '1.25rem', display: 'block' }}>Email</label>
          <input
            type="email"
            name="email"
            value={shopData.email}
            onChange={handleChange}
            required
            style={{
              width: '100%',
              padding: '1.2rem',
              borderRadius: 8,
              border: '1.5px solid #e0e0e0',
              fontSize: '1.15rem',
              outline: 'none',
              background: '#fff',
              marginBottom: 32,
              marginTop: 0,
              boxSizing: 'border-box',
            }}
          />
          <label style={{ fontWeight: 700, color: '#333', marginBottom: 12, fontSize: '1.25rem', display: 'block' }}>Phone Number</label>
          <input
            type="text"
            name="phone"
            value={shopData.phone}
            onChange={handleChange}
            required
            style={{
              width: '100%',
              padding: '1.2rem',
              borderRadius: 8,
              border: '1.5px solid #e0e0e0',
              fontSize: '1.15rem',
              outline: 'none',
              background: '#fff',
              marginBottom: 32,
              marginTop: 0,
              boxSizing: 'border-box',
            }}
          />
          <label style={{ fontWeight: 700, color: '#333', marginBottom: 12, fontSize: '1.25rem', display: 'block' }}>Password</label>
          <input
            type="password"
            name="password"
            value={shopData.password}
            onChange={handleChange}
            required
            style={{
              width: '100%',
              padding: '1.2rem',
              borderRadius: 8,
              border: '1.5px solid #e0e0e0',
              fontSize: '1.15rem',
              outline: 'none',
              background: '#fff',
              marginBottom: 32,
              marginTop: 0,
              boxSizing: 'border-box',
            }}
          />
          <label style={{ fontWeight: 700, color: '#333', marginBottom: 12, fontSize: '1.25rem', display: 'block' }}>Confirm Password</label>
          <input
            type="password"
            name="confirmPassword"
            value={shopData.confirmPassword}
            onChange={handleChange}
            required
            style={{
              width: '100%',
              padding: '1.2rem',
              borderRadius: 8,
              border: '1.5px solid #e0e0e0',
              fontSize: '1.15rem',
              outline: 'none',
              background: '#fff',
              marginBottom: 32,
              marginTop: 0,
              boxSizing: 'border-box',
            }}
          />
          <div style={{ marginBottom: 32, display: 'flex', alignItems: 'center' }}>
            <input type="checkbox" id="shop-terms" name="terms" checked={shopData.terms} onChange={handleChange} required style={{ marginRight: 12, width: 22, height: 22 }} />
            <label htmlFor="shop-terms" style={{ fontWeight: 700, color: '#222', fontSize: '1.15rem', verticalAlign: 'middle' }}>
              I agree to the Terms of Service and Privacy Policy
            </label>
          </div>
          <button type="submit" style={{
            background: '#e74c3c',
            color: '#fff',
            border: 'none',
            padding: '1.1rem 0',
            borderRadius: 8,
            fontWeight: 700,
            fontSize: '1.25rem',
            marginTop: 0,
            marginBottom: 32,
            cursor: loading ? 'not-allowed' : 'pointer',
            opacity: shopData.shopName && shopData.licenseCertificate && shopData.tin && shopData.address && shopData.owner && shopData.email && shopData.phone && shopData.password && shopData.confirmPassword && shopData.terms ? 1 : 0.7,
            width: 120,
            alignSelf: 'flex-start',
            transition: 'background 0.2s',
          }} disabled={!(shopData.shopName && shopData.licenseCertificate && shopData.tin && shopData.address && shopData.owner && shopData.email && shopData.phone && shopData.password && shopData.confirmPassword && shopData.terms) || loading}>
            Register
          </button>
          {message && <div style={{ color: '#e74c3c', marginBottom: 18, textAlign: 'center', fontWeight: 600, fontSize: '1.1rem' }}>{message}</div>}
          <div style={{ marginTop: 18, textAlign: 'center', color: '#444', fontSize: '1.15rem' }}>
            Already have an account?{' '}
            <span style={{ color: '#2196f3', fontWeight: 700, cursor: 'pointer' }} onClick={onSwitchToLogin}>Login</span>
          </div>
        </form>
      )}
    </div>
  );
};

export default Register;
