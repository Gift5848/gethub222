import React, { useEffect, useState } from 'react';
import axios from 'axios';

const Profile = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      setError('You must be logged in to view your profile.');
      setLoading(false);
      return;
    }
    axios.get('/api/auth/me', {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => {
        setUser(res.data);
        setLoading(false);
      })
      .catch(err => {
        setError(
          err.response?.data?.message ||
          err.response?.data?.error ||
          err.message ||
          'Failed to load profile.'
        );
        setLoading(false);
      });
  }, []);

  if (loading) return <div style={{textAlign:'center',marginTop:40}}>Loading profile...</div>;
  if (error) return <div style={{color:'#e74c3c',textAlign:'center',marginTop:40}}>{error}</div>;
  if (!user) return null;

  return (
    <div style={{
      maxWidth: 600,
      margin: '3rem auto',
      background: '#fff',
      borderRadius: 18,
      boxShadow: '0 4px 24px rgba(44,62,80,0.10)',
      padding: '2.5rem 2rem',
      fontFamily: 'Poppins, Arial, sans-serif',
      position: 'relative',
    }}>
      <h2 style={{ fontWeight: 700, fontSize: '2rem', marginBottom: 32, color: '#222' }}>My Profile</h2>
      <div style={{ fontSize: '1.2rem', marginBottom: 18 }}><b>Name:</b> {user.username || user.name}</div>
      <div style={{ fontSize: '1.2rem', marginBottom: 18 }}><b>Email:</b> {user.email}</div>
      {user.phone && <div style={{ fontSize: '1.2rem', marginBottom: 18 }}><b>Phone:</b> {user.phone}</div>}
      {user.city && <div style={{ fontSize: '1.2rem', marginBottom: 18 }}><b>City:</b> {user.city}</div>}
      <div style={{ fontSize: '1.2rem', marginBottom: 18 }}><b>Role:</b> {user.role || 'User'}</div>
    </div>
  );
};

export default Profile;
