import React, { useEffect, useState } from 'react';
import axios from 'axios';

const BACKEND_BASE_URL = process.env.REACT_APP_API_URL;

const AdminOrders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusUpdate, setStatusUpdate] = useState({});
  const [deliveryPerson, setDeliveryPerson] = useState({});

  useEffect(() => {
    const token = localStorage.getItem('token');
    axios.get('/api/orders', {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => {
        console.log('[DEBUG] /api/orders response:', res.data);
        setOrders(res.data);
      })
      .catch((err) => {
        setError('Failed to load orders.');
        console.error('[DEBUG] /api/orders error:', err?.response?.data || err);
      })
      .finally(() => setLoading(false));
  }, []);

  const handleStatusChange = (orderId, newStatus) => {
    setStatusUpdate({ ...statusUpdate, [orderId]: newStatus });
  };

  const handleDeliveryPersonChange = (orderId, person) => {
    setDeliveryPerson({ ...deliveryPerson, [orderId]: person });
  };

  const updateOrder = async (orderId) => {
    const token = localStorage.getItem('token');
    try {
      await axios.patch(`/api/orders/${orderId}`, {
        status: statusUpdate[orderId],
        deliveryPerson: deliveryPerson[orderId]
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setOrders(orders => orders.map(o => o._id === orderId ? { ...o, status: statusUpdate[orderId], deliveryPerson: deliveryPerson[orderId] } : o));
    } catch (err) {
      alert('Failed to update order.');
    }
  };

  if (loading) return <div>Loading orders...</div>;
  if (error) return <div>{error}</div>;
  if (!loading && (!Array.isArray(orders) || orders === undefined)) {
    return <div style={{color:'red'}}>Orders data is not an array: <pre>{JSON.stringify(orders, null, 2)}</pre></div>;
  }
  if (!loading && orders.length === 0) return <div>No orders found.</div>;
  console.log('[DEBUG] orders:', orders);

  return (
    <div style={{maxWidth: 1000, margin: '2rem auto', background: '#fff', borderRadius: 8, boxShadow: '0 2px 8px #eee', padding: 24}}>
      <h2>Admin Order Management</h2>
      <ul style={{listStyle: 'none', padding: 0}}>
        {orders.map(order => (
          <li key={order._id} style={{marginBottom: 16, borderBottom: '1px solid #eee', paddingBottom: 8}}>
            <div><strong>Order ID:</strong> {order._id}</div>
            <div><strong>Status:</strong> {order.status}</div>
            <div><strong>Total:</strong> ${order.total}</div>
            <div><strong>Date:</strong> {order.createdAt ? new Date(order.createdAt).toLocaleString() : ''}</div>
            <div><strong>Products:</strong>
              <ul>
                {order.products.map((item, idx) => (
                  <li key={idx}>{item.product?.name || item.product} x {item.quantity} @ {item.price}</li>
                ))}
              </ul>
            </div>
            <div>
              <label>Status: </label>
              <select value={statusUpdate[order._id] || order.status} onChange={e => handleStatusChange(order._id, e.target.value)}>
                <option value="pending">Pending</option>
                <option value="processing">Processing</option>
                <option value="shipped">Shipped</option>
                <option value="delivered">Delivered</option>
              </select>
            </div>
            <div>
              <label>Delivery Person: </label>
              <input type="text" value={deliveryPerson[order._id] || order.deliveryPerson || ''} onChange={e => handleDeliveryPersonChange(order._id, e.target.value)} placeholder="Enter delivery person name or ID" />
            </div>
            <div><strong>Payment Method:</strong> {order.paymentMethod || '-'}</div>
            {['cbe','telebirr'].includes(order.paymentMethod) && (
              <>
                <div><strong>Transaction Number:</strong> {order.paymentTransaction || '-'}</div>
                <div><strong>Payment Approval Status:</strong> {order.paymentApprovalStatus || 'pending'}</div>
                {order.receiptUrl && (
                  <div style={{margin:'8px 0'}}>
                    <strong>Payment Receipt:</strong><br/>
                    <span style={{fontSize:'0.9em',color:'#888'}}>URL: {order.receiptUrl.startsWith('http') ? order.receiptUrl : `${BACKEND_BASE_URL}${order.receiptUrl}`}</span><br/>
                    <a href={order.receiptUrl.startsWith('http') ? order.receiptUrl : `${BACKEND_BASE_URL}${order.receiptUrl}`} target="_blank" rel="noopener noreferrer">View Receipt</a>
                  </div>
                )}
                {order.paymentApprovalStatus === 'pending' && (
                  <div style={{marginTop:8}}>
                    <button style={{background:'#27ae60',color:'#fff',marginRight:8,padding:'6px 16px',border:'none',borderRadius:4}} onClick={async()=>{
                      const token = localStorage.getItem('token');
                      await axios.patch(`/api/orders/${order._id}/approve-payment`, { action: 'approve' }, { headers: { Authorization: `Bearer ${token}` } });
                      setOrders(orders => orders.map(o => o._id === order._id ? { ...o, paymentApprovalStatus: 'approved', paymentStatus: 'paid' } : o));
                    }}>Approve Payment</button>
                    <button style={{background:'#e74c3c',color:'#fff',padding:'6px 16px',border:'none',borderRadius:4}} onClick={async()=>{
                      const token = localStorage.getItem('token');
                      await axios.patch(`/api/orders/${order._id}/approve-payment`, { action: 'reject' }, { headers: { Authorization: `Bearer ${token}` } });
                      setOrders(orders => orders.map(o => o._id === order._id ? { ...o, paymentApprovalStatus: 'rejected', paymentStatus: 'unpaid' } : o));
                    }}>Reject Payment</button>
                  </div>
                )}
              </>
            )}
            <button onClick={() => updateOrder(order._id)}>Update Order</button>
            <pre style={{fontSize:'0.8em',background:'#f9f9f9',padding:'8px',borderRadius:'4px',overflowX:'auto'}}>{JSON.stringify(order, null, 2)}</pre>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default AdminOrders;
