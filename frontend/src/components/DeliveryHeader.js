import React from 'react';

const DeliveryHeader = ({ onLogout, user }) => (
  <header style={{
    background: '#232946', color: '#fff', padding: '1rem 2rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 2px 8px #eee', borderRadius: '0 0 12px 12px', marginBottom: 24
  }}>
    <div style={{ fontWeight: 700, fontSize: 22 }}>Delivery Dashboard</div>
    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
      <span style={{ fontSize: 16 }}>Welcome, {user?.username || 'Delivery'}</span>
      <button onClick={onLogout} style={{ background: '#e74c3c', color: '#fff', border: 'none', borderRadius: 6, padding: '6px 16px', fontWeight: 600, cursor: 'pointer' }}>Logout</button>
    </div>
  </header>
);

export default DeliveryHeader;
