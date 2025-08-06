import React, { useEffect, useState } from 'react';
import axios from 'axios';
import FileSaver from 'file-saver';

const Orders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expandedOrder, setExpandedOrder] = useState(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sortBy, setSortBy] = useState('newest'); // 'newest', 'oldest', 'status'
  const [reviewModal, setReviewModal] = useState({ open: false, orderId: null });
  const [review, setReview] = useState({ rating: 5, comment: '' });

  useEffect(() => {
    const token = localStorage.getItem('token');
    axios.get(`${process.env.REACT_APP_API_URL}/api/orders/my`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => setOrders(res.data))
      .catch(err => {
        const msg = err.response?.data?.error || err.message || 'Failed to load orders.';
        setError('Failed to load orders. ' + msg);
      })
      .finally(() => setLoading(false));
  }, []);

  const cancelOrder = async (orderId) => {
    const token = localStorage.getItem('token');
    if (!window.confirm('Are you sure you want to cancel this order?')) return;
    try {
      await axios.delete(`${process.env.REACT_APP_API_URL}/api/orders/${orderId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setOrders(orders.filter(order => order._id !== orderId));
    } catch (err) {
      alert('Failed to cancel order: ' + (err.response?.data?.error || err.message));
    }
  };

  const downloadInvoice = async (orderId) => {
    const token = localStorage.getItem('token');
    try {
      const res = await axios.get(`${process.env.REACT_APP_API_URL}/api/orders/${orderId}/invoice`, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: 'blob'
      });
      FileSaver.saveAs(res.data, `invoice-${orderId}.pdf`);
    } catch (err) {
      alert('Failed to download invoice: ' + (err.response?.data?.error || err.message));
    }
  };

  const trackShipment = async (orderId) => {
    const token = localStorage.getItem('token');
    try {
      const res = await axios.get(`${process.env.REACT_APP_API_URL}/api/orders/${orderId}/track`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      alert(`Tracking Number: ${res.data.trackingNumber}\nStatus: ${res.data.status}`);
    } catch (err) {
      alert('Failed to track shipment: ' + (err.response?.data?.error || err.message));
    }
  };

  const reorder = async (orderId) => {
    const token = localStorage.getItem('token');
    try {
      const res = await axios.post(`${process.env.REACT_APP_API_URL}/api/orders/${orderId}/reorder`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      // Add products to cart in localStorage
      const user = JSON.parse(localStorage.getItem('user'));
      const userId = user?._id || 'guest';
      const cartKey = `cart_${userId}`;
      const cart = JSON.parse(localStorage.getItem(cartKey)) || [];
      res.data.products.forEach(item => {
        if (!cart.some(c => c._id === item.product._id)) {
          cart.push({ ...item.product, quantity: item.quantity });
        }
      });
      localStorage.setItem(cartKey, JSON.stringify(cart));
      alert('Products from this order have been added to your cart!');
    } catch (err) {
      alert('Failed to reorder: ' + (err.response?.data?.error || err.message));
    }
  };

  const openReviewModal = (orderId) => {
    setReviewModal({ open: true, orderId });
    setReview({ rating: 5, comment: '' });
  };

  const submitReview = async () => {
    const token = localStorage.getItem('token');
    try {
      await axios.post(`${process.env.REACT_APP_API_URL}/api/orders/${reviewModal.orderId}/review`, review, {
        headers: { Authorization: `Bearer ${token}` }
      });
      alert('Review submitted!');
      setReviewModal({ open: false, orderId: null });
    } catch (err) {
      alert('Failed to submit review: ' + (err.response?.data?.error || err.message));
    }
  };

  // --- Delivery Progress Bar and Buyer Confirmation ---
  const renderOrderProgress = (order) => {
    const steps = [
      { key: 'accepted', label: 'Accepted' },
      { key: 'handedover', label: 'Shop Handover' },
      { key: 'deliveryreceived', label: 'Delivery Received' },
      { key: 'buyerreceived', label: 'Buyer Received' },
      { key: 'delivered', label: 'Delivered' },
    ];
    const currentStep = steps.findIndex(s => order.status === s.key);
    return (
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 8 }}>
        {steps.map((step, idx) => (
          <React.Fragment key={step.key}>
            <div style={{
              width: 18, height: 18, borderRadius: '50%',
              background: idx <= currentStep ? '#00b894' : '#dfe6e9',
              color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700
            }}>{idx + 1}</div>
            {idx < steps.length - 1 && <div style={{ width: 32, height: 4, background: idx < currentStep ? '#00b894' : '#dfe6e9' }} />}
          </React.Fragment>
        ))}
        <span style={{ marginLeft: 12, fontWeight: 600 }}>{steps[currentStep]?.label || 'Pending'}</span>
      </div>
    );
  };

  // Filter/search logic
  const filteredOrders = orders.filter(order => {
    const matchesSearch = search === '' || order._id.includes(search) || (order.products && order.products.some(p => p.product?.name?.toLowerCase().includes(search.toLowerCase())));
    const matchesStatus = statusFilter === '' || order.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Sort logic
  const sortedOrders = [...filteredOrders].sort((a, b) => {
    if (sortBy === 'newest') {
      return new Date(b.createdAt) - new Date(a.createdAt);
    } else if (sortBy === 'oldest') {
      return new Date(a.createdAt) - new Date(b.createdAt);
    } else if (sortBy === 'status') {
      return (a.status || '').localeCompare(b.status || '');
    }
    return 0;
  });

  if (loading) return <div style={{padding: '2rem'}}>Loading orders...</div>;
  if (error) return <div style={{padding: '2rem', color: 'red'}}>{error}</div>;
  if (orders.length === 0) return <div style={{padding: '2rem'}}><h2>No orders found.</h2></div>;

  return (
    <div style={{maxWidth: 900, margin: '2rem auto', background: '#fff', borderRadius: 8, boxShadow: '0 2px 8px #eee', padding: 24}}>
      <h2>Your Orders</h2>
      {/* Filter/Search UI */}
      <div style={{marginBottom: 20, display: 'flex', gap: 16, alignItems: 'center'}}>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by order ID or product name" style={{padding: 6, borderRadius: 4, border: '1px solid #ccc', width: 220}} />
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={{padding: 6, borderRadius: 4, border: '1px solid #ccc'}}>
          <option value="">All Statuses</option>
          <option value="pending">Pending</option>
          <option value="processing">Processing</option>
          <option value="shipped">Shipped</option>
          <option value="delivered">Delivered</option>
          <option value="cancelled">Cancelled</option>
        </select>
        <select value={sortBy} onChange={e => setSortBy(e.target.value)} style={{padding: 6, borderRadius: 4, border: '1px solid #ccc'}}>
          <option value="newest">Newest First</option>
          <option value="oldest">Oldest First</option>
          <option value="status">Status</option>
        </select>
      </div>
      <ul style={{listStyle: 'none', padding: 0}}>
        {sortedOrders.map(order => (
          <li key={order._id} style={{marginBottom: 16, borderBottom: '1px solid #eee', paddingBottom: 8}}>
            {renderOrderProgress(order)}
            <div style={{display:'flex', alignItems:'center', justifyContent:'space-between'}}>
              <div>
                <strong>Order ID:</strong> {order._id}<br/>
                <strong>Status:</strong> {order.status}<br/>
                <strong>Total:</strong> ${order.total}<br/>
                <strong>Date:</strong> {order.createdAt ? new Date(order.createdAt).toLocaleString() : ''}
              </div>
              <div style={{display:'flex', gap:8}}>
                <button onClick={() => setExpandedOrder(expandedOrder === order._id ? null : order._id)} style={{background:'#2980ef', color:'#fff', border:'none', borderRadius:4, padding:'6px 14px', cursor:'pointer'}}>View Details</button>
                <button onClick={() => downloadInvoice(order._id)} style={{background:'#8e44ad', color:'#fff', border:'none', borderRadius:4, padding:'6px 14px', cursor:'pointer'}}>Download Invoice</button>
                <button onClick={() => trackShipment(order._id)} style={{background:'#16a085', color:'#fff', border:'none', borderRadius:4, padding:'6px 14px', cursor:'pointer'}}>Track Shipment</button>
                <button onClick={() => reorder(order._id)} style={{background:'#f39c12', color:'#fff', border:'none', borderRadius:4, padding:'6px 14px', cursor:'pointer'}}>Reorder</button>
                {order.status === 'delivered' && <button onClick={() => openReviewModal(order._id)} style={{background:'#27ae60', color:'#fff', border:'none', borderRadius:4, padding:'6px 14px', cursor:'pointer'}}>Rate/Review</button>}
                {order.status === 'pending' && (
                  <button onClick={() => cancelOrder(order._id)} style={{background: '#e74c3c', color: '#fff', border: 'none', borderRadius: 4, padding: '6px 18px', cursor: 'pointer'}}>Cancel Order</button>
                )}
                {order.status === 'deliveryreceived' && (
                  <button onClick={async () => {
                    const token = localStorage.getItem('token');
                    try {
                      await axios.patch(`${process.env.REACT_APP_API_URL}/api/orders/${order._id}/buyerreceived`, {}, { headers: { Authorization: `Bearer ${token}` } });
                      setOrders(orders => orders.map(o => o._id === order._id ? { ...o, status: 'buyerreceived' } : o));
                    } catch (err) {
                      alert('Failed to confirm receipt: ' + (err.response?.data?.error || err.message));
                    }
                  }} style={{background:'#00b894', color:'#fff', border:'none', borderRadius:4, padding:'6px 14px', fontWeight:600}}>Received</button>
                )}
              </div>
            </div>
            {/* Expandable order details */}
            {expandedOrder === order._id && (
              <div style={{marginTop:12, background:'#f8f8f8', borderRadius:4, padding:12}}>
                <div><strong>Shipping Address:</strong> {order.shippingAddress || 'N/A'}</div>
                <div><strong>Products:</strong>
                  <ul>
                    {order.products.map((item, idx) => (
                      <li key={idx}>{item.product?.name || 'Product'} x {item.quantity} @ {item.price}</li>
                    ))}
                  </ul>
                </div>
                <div><strong>Order Status:</strong> {order.status}</div>
                {/* Placeholders for tracking, invoice, review, etc. */}
              </div>
            )}
          </li>
        ))}
      </ul>
      {/* Review Modal */}
      {reviewModal.open && (
        <div style={{position:'fixed', top:0, left:0, width:'100vw', height:'100vh', background:'rgba(0,0,0,0.3)', zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center'}}>
          <div style={{background:'#fff', borderRadius:8, padding:24, minWidth:320}}>
            <h3>Rate & Review Order</h3>
            <div style={{marginBottom:12}}>
              <label>Rating: </label>
              <select value={review.rating} onChange={e => setReview(r => ({...r, rating: Number(e.target.value)}))}>
                {[1,2,3,4,5].map(n => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
            <div style={{marginBottom:12}}>
              <label>Comment: </label>
              <textarea value={review.comment} onChange={e => setReview(r => ({...r, comment: e.target.value}))} style={{width:'100%', minHeight:60}} />
            </div>
            <button onClick={submitReview} style={{background:'#27ae60', color:'#fff', border:'none', borderRadius:4, padding:'6px 18px', cursor:'pointer', marginRight:8}}>Submit</button>
            <button onClick={() => setReviewModal({ open: false, orderId: null })} style={{background:'#e74c3c', color:'#fff', border:'none', borderRadius:4, padding:'6px 18px', cursor:'pointer'}}>Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Orders;
