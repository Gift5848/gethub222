import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

const PaymentSuccess = () => {
  const location = useLocation();
  const navigate = useNavigate();
  // Extract tx_ref from query params
  const params = new URLSearchParams(location.search);
  const tx_ref = params.get('tx_ref');
  const [status, setStatus] = useState('pending');
  const [error, setError] = useState('');
  const [order, setOrder] = useState(null);

  useEffect(() => {
    if (!tx_ref) {
      setError('No transaction reference found.');
      setStatus('error');
      return;
    }
    let attempts = 0;
    const maxAttempts = 30; // Wait up to 1 minute
    // Poll backend for payment status
    const interval = setInterval(async () => {
      attempts++;
      try {
        const res = await fetch(`/api/orders/public/${tx_ref}`);
        const data = await res.json();
        // DEBUG: Show backend response and token
        console.log('[PaymentSuccess Poll] /api/orders/public/' + tx_ref, data);
        if (data.paymentStatus === 'paid') {
          setStatus('paid');
          setOrder(data);
          clearInterval(interval);
          // Wait 3s before redirecting
          setTimeout(() => navigate(`/order-confirmation?orderId=${tx_ref}`), 3000);
        } else if (data.paymentStatus === 'failed') {
          setStatus('failed');
          clearInterval(interval);
        } else if (attempts >= maxAttempts) {
          setError('Payment confirmation timed out. Please check your order status or contact support.');
          setStatus('error');
          clearInterval(interval);
        }
        // Extra debug: log when polling times out
        if (attempts === maxAttempts) {
          console.error('[PaymentSuccess Poll] Timed out after', maxAttempts, 'attempts. Last response:', data);
        }
      } catch (err) {
        setError('Failed to check payment status.');
        setStatus('error');
        clearInterval(interval);
        // Extra debug: log fetch error
        console.error('[PaymentSuccess Poll] Fetch error:', err);
      }
    }, 2000);
    return () => clearInterval(interval);
  }, [tx_ref, navigate]);

  return (
    <div style={{maxWidth: 500, margin: '40px auto', background: '#fff', borderRadius: 8, boxShadow: '0 2px 8px #eee', padding: 24}}>
      <h2>Payment Status</h2>
      {status === 'pending' && (
        <>
          <div style={{display:'flex',alignItems:'center',gap:10}}>
            <span className="loader" style={{width:22,height:22,border:'3px solid #eee',borderTop:'3px solid #27ae60',borderRadius:'50%',animation:'spin 1s linear infinite',display:'inline-block'}}></span>
            <span>Checking payment status...</span>
          </div>
          <style>{`@keyframes spin{0%{transform:rotate(0)}100%{transform:rotate(360deg)}}`}</style>
        </>
      )}
      {status === 'paid' && (
        <div style={{color:'green',fontWeight:600}}>
          <div style={{fontSize:22,marginBottom:8}}>✅ Payment Successful!</div>
          <div>Your order has been confirmed and is now processing.</div>
          {order && (
            <div style={{marginTop:18,background:'#f8f8f8',padding:14,borderRadius:8}}>
              <div><b>Order ID:</b> {tx_ref}</div>
              <div><b>Status:</b> {order.status}</div>
              <div><b>Payment Status:</b> {order.paymentStatus}</div>
            </div>
          )}
          <div style={{marginTop:12,fontSize:14}}>You will be redirected to your order details shortly.</div>
        </div>
      )}
      {status === 'failed' && <p style={{color:'red'}}>Payment failed. Please try again or contact support.</p>}
      {status === 'error' && <p style={{color:'red'}}>{error}</p>}
    </div>
  );
};

export default PaymentSuccess;
