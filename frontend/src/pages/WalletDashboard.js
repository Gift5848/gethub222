import React, { useEffect, useState } from 'react';
import axios from 'axios';

const WalletDashboard = () => {
  const user = JSON.parse(localStorage.getItem('user')) || JSON.parse(localStorage.getItem('subadmin_user'));
  const [wallet, setWallet] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [error, setError] = useState('');
  const [apiError, setApiError] = useState('');
  const [success, setSuccess] = useState('');
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(true);
  const token = localStorage.getItem('token') || (user && user.token);
  // Deposit modal/payment state
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [depositMethod, setDepositMethod] = useState('');
  const [depositCode, setDepositCode] = useState('');
  const [depositReceipt, setDepositReceipt] = useState(null);
  const [depositLoading, setDepositLoading] = useState(false);
  const [depositChapaTxRef, setDepositChapaTxRef] = useState('');
  const [depositWaitingChapa, setDepositWaitingChapa] = useState(false);
  const [depositChapaStatus, setDepositChapaStatus] = useState('');

  // Move fetchWallet and fetchTransactions outside useEffect for reuse
  const fetchWallet = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`https://salty-shore-60443-1ab4fdf8d6bb.herokuapp.com/api/wallet/${user.shopId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log('WALLET API RESPONSE:', res.data); // Debug log
      setWallet(res.data);
    } catch (err) {
      setApiError(JSON.stringify(err.response?.data || err.message));
      setError('Could not fetch wallet info.');
    } finally {
      setLoading(false);
    }
  };
  const fetchTransactions = async () => {
    try {
      const res = await axios.get(`https://salty-shore-60443-1ab4fdf8d6bb.herokuapp.com/api/wallet/${user.shopId}/transactions`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setTransactions(res.data);
    } catch (err) {
      setApiError(JSON.stringify(err.response?.data || err.message));
      setError('Could not fetch transactions.');
    }
  };

  useEffect(() => {
    if (!user || !user.shopId || !token) {
      setError('User, shopId, or token missing. Please log in again.');
      setLoading(false);
      return;
    }
    fetchWallet();
    fetchTransactions();
  }, [user?.shopId, token]);

  // Chapa payment for deposit
  const handleDepositChapa = async () => {
    setDepositLoading(true);
    try {
      const res = await axios.post('https://salty-shore-60443-1ab4fdf8d6bb.herokuapp.com/api/payment/chapa', {
        amount: Number(amount),
        reason: 'Wallet deposit',
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data && (res.data.paymentUrl || res.data.checkout_url) && (res.data.tx_ref || res.data.checkout_url)) {
        setDepositChapaTxRef(res.data.tx_ref || res.data.checkout_url.split('=')[1]);
        setDepositWaitingChapa(true);
        window.open(res.data.paymentUrl || res.data.checkout_url, '_blank');
        setSuccess('Complete your payment in the new tab. Waiting for payment confirmation...');
      } else {
        setError('Failed to initiate Chapa payment.');
      }
    } catch (err) {
      setError('Error initiating Chapa payment.');
    }
    setDepositLoading(false);
  };

  // Poll Chapa status for deposit
  const pollDepositChapaStatus = async () => {
    if (!depositChapaTxRef) return;
    setDepositChapaStatus('Checking...');
    try {
      const res = await axios.get(`https://salty-shore-60443-1ab4fdf8d6bb.herokuapp.com/api/payments/chapa/status?tx_ref=${depositChapaTxRef}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data && res.data.status === 'success') {
        setDepositChapaStatus('Payment confirmed!');
        setDepositCode(res.data.confirmationCode || depositChapaTxRef);
        setDepositWaitingChapa(false);
        setSuccess('Payment confirmed. You can now submit your deposit.');
      } else {
        setDepositChapaStatus('Payment not confirmed yet.');
      }
    } catch {
      setDepositChapaStatus('Error checking payment status.');
    }
  };

  useEffect(() => {
    let interval;
    if (depositMethod === 'Chapa' && depositWaitingChapa && depositChapaTxRef) {
      interval = setInterval(() => {
        pollDepositChapaStatus();
      }, 5000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [depositMethod, depositWaitingChapa, depositChapaTxRef]);

  const handleDepositSubmit = async () => {
    setError(''); setSuccess('');
    if (!amount || isNaN(amount) || Number(amount) <= 0) {
      setError('Enter a valid amount.');
      return;
    }
    if (!depositMethod) {
      setError('Select a payment method.');
      return;
    }
    if (depositMethod === 'Chapa') {
      await handleDepositChapa();
      return;
    }
    if (!depositCode.trim()) {
      setError('Please enter your payment confirmation code.');
      return;
    }
    setDepositLoading(true);
    try {
      const formData = new FormData();
      formData.append('shopId', user.shopId);
      formData.append('amount', Number(amount));
      formData.append('paymentMethod', depositMethod);
      formData.append('paymentCode', depositCode);
      if (depositReceipt) formData.append('receipt', depositReceipt);
      await axios.post('https://salty-shore-60443-1ab4fdf8d6bb.herokuapp.com/api/wallet/deposit', formData, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' }
      });
      setSuccess('Deposit successful!');
      setAmount('');
      setDepositCode('');
      setDepositReceipt(null);
      setShowDepositModal(false);
      fetchWallet();
      fetchTransactions();
    } catch (err) {
      setApiError(JSON.stringify(err.response?.data || err.message));
      setError(err.response?.data?.error || 'Deposit failed.');
    }
    setDepositLoading(false);
  };

  if (loading) return <div style={{padding:40}}>Loading wallet info...<br/>user: {JSON.stringify(user)}<br/>shopId: {user?.shopId}<br/>token: {token ? 'present' : 'missing'}</div>;
  if (error) return <div style={{padding:40, color:'#e74c3c', fontWeight:600}}>{error}<br/>Debug: {apiError}<br/>user: {JSON.stringify(user)}<br/>shopId: {user?.shopId}<br/>token: {token ? 'present' : 'missing'}</div>;
  if (!wallet) return <div style={{padding:40}}>No wallet data found for this shop.<br/>user: {JSON.stringify(user)}<br/>shopId: {user?.shopId}<br/>token: {token ? 'present' : 'missing'}</div>;

  return (
    <div>
      <div style={{color:'blue',fontWeight:700,background:'#e0e6ff',padding:8}}>DEBUG: WalletDashboard component rendered (top-level)</div>
      <div style={{ maxWidth: 600, margin: '40px auto', background: '#fff', borderRadius: 12, boxShadow: '0 2px 16px #dbeafe', padding: 32 }}>
        <h2 style={{ fontWeight: 700, color: '#222', marginBottom: 24 }}>Wallet Dashboard</h2>
        {success && <div style={{ color: '#27ae60', marginBottom: 12, fontWeight: 600 }}>{success}</div>}
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 18, fontWeight: 600 }}>Current Balance: <span style={{ color: '#3a6cf6' }}>{wallet?.balance ?? 'N/A'} birr</span></div>
          <div style={{ fontSize: 16 }}>Frozen: <span style={{ color: '#e67e22' }}>{wallet?.frozen ?? 'N/A'} birr</span></div>
        </div>
        <div style={{ marginBottom: 24 }}>
          <input type="number" placeholder="Amount to deposit" value={amount} onChange={e => setAmount(e.target.value)} style={{ padding: 10, borderRadius: 8, border: '1px solid #ccc', marginRight: 8 }} />
          <button onClick={()=>setShowDepositModal(true)} style={{ background: '#3a6cf6', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 18px', fontWeight: 600, cursor: 'pointer' }}>Deposit</button>
        </div>
        {/* Deposit Modal */}
        {showDepositModal && (
          <div style={{position:'fixed',top:0,left:0,width:'100vw',height:'100vh',background:'rgba(44,62,80,0.18)',zIndex:2200,display:'flex',alignItems:'center',justifyContent:'center'}}>
            <div style={{background:'#fff',padding:24,borderRadius:12,minWidth:340,maxWidth:400,boxShadow:'0 2px 12px #23294655',color:'#232946',display:'flex',flexDirection:'column',gap:12}}>
              <h3 style={{marginBottom:8}}>Deposit to Wallet</h3>
              <div style={{marginBottom:8}}>Select payment method and complete your deposit.</div>
              <select value={depositMethod} onChange={e=>setDepositMethod(e.target.value)} style={{marginBottom:8,padding:8,borderRadius:8,border:'1px solid #ccc'}}>
                <option value="">Select Payment Method</option>
                <option value="Telebirr">Telebirr</option>
                <option value="CBE">CBE</option>
                <option value="Chapa">Chapa</option>
              </select>
              {depositMethod === 'Chapa' && depositWaitingChapa && (
                <div style={{color:'#3a6cf6',marginBottom:8,fontWeight:500}}>
                  Waiting for Chapa payment confirmation...<br/>
                  <button onClick={pollDepositChapaStatus} style={{marginTop:8,marginBottom:8,padding:'6px 14px',borderRadius:6,border:'1px solid #3a6cf6',background:'#f5f8ff',color:'#3a6cf6',fontWeight:600}}>Check Payment Status</button>
                  <div style={{marginTop:4}}>{depositChapaStatus}</div>
                </div>
              )}
              {depositMethod === 'Chapa' && !depositWaitingChapa && (
                <div style={{color:'#3a6cf6',marginBottom:8,fontWeight:500}}>
                  You will be redirected to Chapa to complete your payment. After payment, enter the confirmation code and upload your receipt below.
                </div>
              )}
              <input type="text" value={depositCode} onChange={e=>setDepositCode(e.target.value)} placeholder="Enter payment confirmation code" style={{marginBottom:8,padding:8,borderRadius:8,border:'1px solid #ccc'}} />
              <label style={{fontWeight:600,marginBottom:4}}>Upload Payment Receipt (optional)</label>
              <input type="file" accept="image/*" onChange={e=>setDepositReceipt(e.target.files[0])} style={{marginBottom:8,padding:8,borderRadius:8,border:'1px solid #ccc'}} />
              <button className="btn btn-primary" onClick={handleDepositSubmit} style={{padding:'8px 16px',borderRadius:8}} disabled={depositLoading || depositWaitingChapa}>{depositLoading ? 'Processing...' : depositWaitingChapa ? 'Waiting for Payment...' : 'Submit Deposit'}</button>
              <button className="btn btn-outline" onClick={()=>setShowDepositModal(false)} style={{marginTop:8}}>Cancel</button>
            </div>
          </div>
        )}
        <h3 style={{ fontWeight: 700, marginBottom: 12 }}>Recent Transactions</h3>
        <div style={{ maxHeight: 220, overflowY: 'auto', background: '#f5f8ff', borderRadius: 8, padding: 12 }}>
          {transactions.length === 0 && <div>No transactions found.</div>}
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {transactions.map((tx, idx) => (
              <li key={idx} style={{ marginBottom: 8, fontSize: 15 }}>
                <b>{tx.type.toUpperCase()}</b> - {tx.amount} birr <span style={{ color: '#888', fontSize: 13 }}>({new Date(tx.date).toLocaleString()})</span><br />
                <span style={{ color: '#555' }}>{tx.description}</span>
              </li>
            ))}
          </ul>
        </div>
        <div style={{marginTop:24, color:'#888', fontSize:12}}>
          Debug info:<br/>user: {JSON.stringify(user)}<br/>shopId: {user?.shopId}<br/>token: {token ? 'present' : 'missing'}<br/>API error: {apiError}
        </div>
      </div>
    </div>
  );
};

export default WalletDashboard;
