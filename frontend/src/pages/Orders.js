import React, { useEffect, useState } from 'react';
import axios from 'axios';

const Orders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('token');
    axios.get('http://localhost:5000/api/orders/my', {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => setOrders(res.data))
      .catch(err => setError('Failed to load orders.'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div style={{padding: '2rem'}}>Loading orders...</div>;
  if (error) return <div style={{padding: '2rem', color: 'red'}}>{error}</div>;
  if (orders.length === 0) return <div style={{padding: '2rem'}}><h2>No orders found.</h2></div>;

  return (
    <div style={{maxWidth: 900, margin: '2rem auto', background: '#fff', borderRadius: 8, boxShadow: '0 2px 8px #eee', padding: 24}}>
      <h2>Your Orders</h2>
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
                  <li key={idx}>{item.product?.name || 'Product'} x {item.quantity} @ {item.price}</li>
                ))}
              </ul>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default Orders;
