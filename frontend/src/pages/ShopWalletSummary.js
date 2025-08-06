import React, { useEffect, useState } from 'react';
import axios from 'axios';

const ShopWalletSummary = () => {
  const user = JSON.parse(localStorage.getItem('user'));
  const [wallet, setWallet] = useState(null);
  const [error, setError] = useState('');
  const token = localStorage.getItem('token');

  useEffect(() => {
    if (!user?.shopId) return;
    const fetchWallet = async () => {
      try {
        const res = await axios.get(`${process.env.REACT_APP_API_URL}/api/wallet/${user.shopId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setWallet(res.data);
      } catch (err) {
        setError('Could not fetch wallet info.');
      }
    };
    fetchWallet();
  }, [user, token]);

  if (!user?.shopId) return null;
  return (
    <div style={{ background: '#f5f8ff', borderRadius: 10, padding: 18, marginBottom: 24, boxShadow: '0 1px 6px #dbeafe' }}>
      <h3 style={{ margin: 0, fontWeight: 700, color: '#3a6cf6', fontSize: 18 }}>Wallet Summary</h3>
      {error && <div style={{ color: '#e74c3c', fontWeight: 600 }}>{error}</div>}
      {wallet && (
        <div style={{ marginTop: 8 }}>
          <div>Balance: <b>{wallet.balance} birr</b></div>
          <div>Frozen: <b>{wallet.frozen} birr</b></div>
        </div>
      )}
    </div>
  );
};

export default ShopWalletSummary;
