// MyOrders.js
import React, { useEffect, useState } from 'react';

const MyOrders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('token');
    fetch(`${process.env.REACT_APP_API_URL}/api/orders/my`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    })
      .then(res => res.json())
      .then(data => {
        setOrders(data);
        setLoading(false);
      })
      .catch(err => {
        setError('Failed to fetch orders');
        setLoading(false);
      });
  }, []);

  if (loading) return <div>Loading orders...</div>;
  if (error) return <div>{error}</div>;
  if (!orders.length) return <div>No orders found.</div>;

  return (
    <div style={{maxWidth: 900, margin: '2rem auto', background: '#fff', borderRadius: 8, boxShadow: '0 2px 8px #eee', padding: 24}}>
      <h2>My Orders</h2>
      <ul style={{listStyle: 'none', padding: 0}}>
        {orders.map(order => (
          <li key={order._id} style={{marginBottom: 16, borderBottom: '1px solid #eee', paddingBottom: 8}}>
            <div><strong>Order ID:</strong> {order._id}</div>
            <div><strong>Status:</strong> <span style={{color: order.status === 'delivered' ? 'green' : order.status === 'shipped' ? 'blue' : order.status === 'processing' ? 'orange' : 'gray'}}>{order.status || 'Pending'}</span></div>
            <div><strong>Total:</strong> ${order.total}</div>
            <div><strong>Date:</strong> {order.createdAt ? new Date(order.createdAt).toLocaleString() : ''}</div>
            <div><strong>Products:</strong></div>
            <ul>
              {order.products.map((item, idx) => (
                <li key={idx}>{(item.product && item.product.name) ? item.product.name : (item.product && item.product._id ? item.product._id : item.product)} x {item.quantity} @ {item.price}</li>
              ))}
            </ul>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default MyOrders;
