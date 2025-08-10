import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { FaCheckCircle, FaTimesCircle, FaHourglassHalf, FaSearch, FaDownload, FaPlus, FaMinus } from 'react-icons/fa';

const API_URL = process.env.REACT_APP_API_URL || '';

const AdminWalletTransactions = () => {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedTx, setSelectedTx] = useState(null);
  const [receiptUrl, setReceiptUrl] = useState('');
  const [actionMsg, setActionMsg] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [shopFilter, setShopFilter] = useState('');
  const [showExport, setShowExport] = useState(false);
  const [showCreditModal, setShowCreditModal] = useState(false);
  const [creditAmount, setCreditAmount] = useState('');
  const [creditReason, setCreditReason] = useState('');
  const [creditShopId, setCreditShopId] = useState('');
  const [walletBalances, setWalletBalances] = useState({});
  const token = localStorage.getItem('admin_token');

  useEffect(() => {
    const fetchTransactions = async () => {
      setLoading(true);
      setError('');
      try {
        const res = await axios.get(`${API_URL}/api/admin/wallet/transactions`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setTransactions(res.data);
      } catch (err) {
        setError('Failed to fetch transactions.');
      }
      setLoading(false);
    };
    fetchTransactions();
  }, [token]);

  const fetchWalletBalance = async (walletId) => {
    try {
      const res = await axios.get(`${API_URL}/api/admin/wallet/${walletId}/balance`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setWalletBalances(prev => ({ ...prev, [walletId]: res.data.balance }));
    } catch {}
  };

  const handleViewReceipt = async (walletId, txIndex) => {
    setReceiptUrl('');
    try {
      const res = await axios.get(`${API_URL}/api/admin/wallet/${walletId}/transaction/${txIndex}/receipt`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setReceiptUrl(res.data.receiptUrl);
    } catch {
      setReceiptUrl('');
      setActionMsg('Could not fetch receipt.');
    }
  };

  const handleApprove = async (walletId, txIndex, action) => {
    setActionMsg('');
    try {
      const res = await axios.patch(`${API_URL}/api/admin/wallet/${walletId}/transaction/${txIndex}/approve`, { action }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setActionMsg(`${res.data.message} New balance: ${res.data.balance}`);
      // Refresh transactions
      const updated = await axios.get(`${API_URL}/api/admin/wallet/transactions`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setTransactions(updated.data);
      // Fetch and update wallet balance immediately
      fetchWalletBalance(walletId);
    } catch {
      setActionMsg('Failed to update transaction.');
    }
  };

  // --- CSV Export ---
  const handleExportCSV = () => {
    const headers = ['Shop','Email','Type','Amount','Date','Description','Status'];
    const rows = transactions.map(t => [t.shopName, t.shopEmail, t.transaction.type, t.transaction.amount, new Date(t.transaction.date).toLocaleString(), t.transaction.description, t.transaction.status||'pending']);
    let csv = headers.join(',') + '\n';
    csv += rows.map(r => r.map(x => '"' + String(x).replace(/"/g, '""') + '"').join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'wallet_transactions.csv';
    a.click();
    URL.revokeObjectURL(url);
  };
  // --- Manual Credit/Debit ---
  const handleManualCredit = async (type) => {
    setActionMsg('');
    try {
      await axios.post(`/api/admin/wallet/manual-${type}`, { shopId: creditShopId, amount: Number(creditAmount), reason: creditReason }, { headers: { Authorization: `Bearer ${token}` } });
      setActionMsg(`${type === 'credit' ? 'Credited' : 'Debited'} successfully.`);
      setShowCreditModal(false);
      setCreditAmount(''); setCreditReason(''); setCreditShopId('');
      // Refresh transactions
      const updated = await axios.get('/api/admin/wallet/transactions', { headers: { Authorization: `Bearer ${token}` } });
      setTransactions(updated.data);
    } catch {
      setActionMsg('Failed to update wallet.');
    }
  };

  return (
    <div style={{padding:32}}>
      <h2>All Shop Wallet Transactions</h2>
      <div style={{display:'flex',alignItems:'center',gap:16,marginBottom:18}}>
        <input placeholder="Search shop/email..." value={search} onChange={e=>setSearch(e.target.value)} style={{padding:8,borderRadius:6,border:'1px solid #ccc',minWidth:200}} />
        <select value={statusFilter} onChange={e=>setStatusFilter(e.target.value)} style={{padding:8,borderRadius:6}}>
          <option value="">All Status</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
        </select>
        <button onClick={handleExportCSV} style={{background:'#3a6cf6',color:'#fff',border:'none',borderRadius:6,padding:'8px 16px',fontWeight:700,display:'flex',alignItems:'center',gap:8}}><FaDownload/> Export CSV</button>
        <button onClick={()=>setShowCreditModal(true)} style={{background:'#27ae60',color:'#fff',border:'none',borderRadius:6,padding:'8px 16px',fontWeight:700,display:'flex',alignItems:'center',gap:8}}><FaPlus/> Manual Credit/Debit</button>
      </div>
      {loading ? <div>Loading...</div> : error ? <div style={{color:'red'}}>{error}</div> : (
        <table style={{width:'100%',background:'#fff',borderRadius:8,boxShadow:'0 2px 12px #eee',marginTop:18}}>
          <thead>
            <tr>
              <th>Shop</th>
              <th>Email</th>
              <th>Type</th>
              <th>Amount</th>
              <th>Date</th>
              <th>Description</th>
              <th>Status</th>
              <th>Receipt</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {transactions.filter(t => {
              const matchesSearch = t.shopName?.toLowerCase().includes(search.toLowerCase()) || t.shopEmail?.toLowerCase().includes(search.toLowerCase());
              const matchesStatus = statusFilter ? (t.transaction.status||'pending') === statusFilter : true;
              return matchesSearch && matchesStatus;
            }).map((t, i) => {
              console.log('[ADMIN TX DEBUG]', t.transaction);
              return (
                <tr key={i} style={{background: t.transaction.status==='pending'?'#fffbe6':t.transaction.status==='approved'?'#e8fff0':t.transaction.status==='rejected'?'#ffeaea':'#fff'}}>
                  <td>{t.shopName}</td>
                  <td>{t.shopEmail}</td>
                  <td>{t.transaction.type}</td>
                  <td>{t.transaction.amount}</td>
                  <td>{new Date(t.transaction.date).toLocaleString()}</td>
                  <td>{t.transaction.description}</td>
                  <td>{(() => {
                    const txStatus = t.transaction.status || 'pending';
                    if (txStatus === 'approved') return <span style={{color:'#27ae60',fontWeight:700,display:'flex',alignItems:'center',gap:4}}><FaCheckCircle/> Approved</span>;
                    if (txStatus === 'rejected') return <span style={{color:'#e74c3c',fontWeight:700,display:'flex',alignItems:'center',gap:4}}><FaTimesCircle/> Rejected</span>;
                    return <span style={{color:'#f7c948',fontWeight:700,display:'flex',alignItems:'center',gap:4}}><FaHourglassHalf/> Pending</span>;
                  })()}</td>
                  <td>{t.transaction.receiptUrl ? <button onClick={()=>window.open(t.transaction.receiptUrl, '_blank')}>View</button> : '-'}</td>
                  <td>
                    {!t.transaction.status || t.transaction.status.toLowerCase() === 'pending' ? (
                      selectedTx === `${t._id}-${i}` ? (
                        t.transaction.status === 'approved' ? (
                          <span style={{color:'#27ae60',fontWeight:700,display:'flex',alignItems:'center',gap:4}}><FaCheckCircle/> Approved</span>
                        ) : t.transaction.status === 'rejected' ? (
                          <span style={{color:'#e74c3c',fontWeight:700,display:'flex',alignItems:'center',gap:4}}><FaTimesCircle/> Rejected</span>
                        ) : (
                          <span style={{color:'#f7c948',fontWeight:700,display:'flex',alignItems:'center',gap:4}}><FaHourglassHalf/> Pending</span>
                        )
                      ) : (
                        <>
                          <button onClick={async()=>{
                            await handleApprove(t._id, i, 'approve');
                            setSelectedTx(`${t._id}-${i}`);
                            // Always re-fetch transactions after approval for true backend state
                            const updated = await axios.get(`${API_URL}/api/admin/wallet/transactions`, {
                              headers: { Authorization: `Bearer ${token}` }
                            });
                            setTransactions(updated.data);
                            fetchWalletBalance(t._id);
                          }} style={{background:'#27ae60',color:'#fff',marginRight:6}}>Approve</button>
                          <button onClick={async()=>{
                            await handleApprove(t._id, i, 'reject');
                            setSelectedTx(`${t._id}-${i}`);
                            // Always re-fetch transactions after rejection for true backend state
                            const updated = await axios.get(`${API_URL}/api/admin/wallet/transactions`, {
                              headers: { Authorization: `Bearer ${token}` }
                            });
                            setTransactions(updated.data);
                            fetchWalletBalance(t._id);
                          }} style={{background:'#e74c3c',color:'#fff'}}>Reject</button>
                        </>
                      )
                    ) : t.transaction.status === 'approved' ? (
                      <span style={{color:'#27ae60',fontWeight:700,display:'flex',alignItems:'center',gap:4}}><FaCheckCircle/> Approved</span>
                    ) : t.transaction.status === 'rejected' ? (
                      <span style={{color:'#e74c3c',fontWeight:700,display:'flex',alignItems:'center',gap:4}}><FaTimesCircle/> Rejected</span>
                    ) : (
                      <span style={{color:'#f7c948',fontWeight:700,display:'flex',alignItems:'center',gap:4}}><FaHourglassHalf/> Pending</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
      {receiptUrl && (
        <div style={{marginTop:24}}>
          <h4>Receipt</h4>
          <a href={receiptUrl} target="_blank" rel="noopener noreferrer">View Receipt File</a>
        </div>
      )}
      {actionMsg && <div style={{marginTop:18,color:actionMsg.includes('Failed')?'red':'green'}}>{actionMsg}</div>}
      {showCreditModal && (
        <div style={{position:'fixed',top:0,left:0,width:'100vw',height:'100vh',background:'rgba(0,0,0,0.3)',zIndex:2000,display:'flex',alignItems:'center',justifyContent:'center'}} onClick={()=>setShowCreditModal(false)}>
          <div style={{background:'#fff',padding:32,borderRadius:12,minWidth:340,boxShadow:'0 2px 16px #23294633',position:'relative'}} onClick={e=>e.stopPropagation()}>
            <button onClick={()=>setShowCreditModal(false)} style={{position:'absolute',top:12,right:12,fontSize:22,background:'none',border:'none',cursor:'pointer'}}>&times;</button>
            <h3>Manual Credit/Debit</h3>
            <div style={{marginBottom:12}}>
              <label>Shop ID: <input value={creditShopId} onChange={e=>setCreditShopId(e.target.value)} style={{width:'100%'}} /></label>
            </div>
            <div style={{marginBottom:12}}>
              <label>Amount: <input type="number" value={creditAmount} onChange={e=>setCreditAmount(e.target.value)} style={{width:'100%'}} /></label>
            </div>
            <div style={{marginBottom:12}}>
              <label>Reason: <input value={creditReason} onChange={e=>setCreditReason(e.target.value)} style={{width:'100%'}} /></label>
            </div>
            <div style={{display:'flex',gap:12}}>
              <button onClick={()=>handleManualCredit('credit')} style={{background:'#27ae60',color:'#fff',flex:1}}>Credit</button>
              <button onClick={()=>handleManualCredit('debit')} style={{background:'#e74c3c',color:'#fff',flex:1}}>Debit</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminWalletTransactions;
