import React, { useState } from 'react';
import { useLocation, Link } from 'react-router-dom';
import axios from 'axios';

const OrderConfirmation = () => {
  const location = useLocation();
  const order = location.state?.order;
  const [paid, setPaid] = useState(order?.paymentStatus === 'paid');
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState('');

  if (!order) {
    return <div>No order details found.</div>;
  }

  const handleMarkPaid = async () => {
    setPaying(true);
    setError('');
    try {
      const token = localStorage.getItem('token');
      await axios.patch(`/api/orders/${order._id}/pay`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setPaid(true);
    } catch (err) {
      setError('Failed to mark as paid.');
    }
    setPaying(false);
  };

  return (
    <div style={{maxWidth: 600, margin: '2rem auto', background: '#fff', borderRadius: 8, boxShadow: '0 2px 8px #eee', padding: 24}}>
      <h2>Order Confirmation</h2>
      <p>Thank you for your order! Your order has been placed successfully.</p>
      <h3>Order Details</h3>
      {order._id && <div><strong>Order ID:</strong> {order._id}</div>}
      {order.status && <div><strong>Status:</strong> {order.status}</div>}
      {order.total && <div><strong>Total:</strong> ${order.total}</div>}
      {order.createdAt && <div><strong>Date:</strong> {order.createdAt ? new Date(order.createdAt).toLocaleString() : ''}</div>}
      {order.paymentStatus && <div><strong>Payment Status:</strong> {paid ? <span style={{color:'green'}}>Paid</span> : <span style={{color:'red'}}>Unpaid</span>}</div>}
      {!paid && order._id && <button onClick={handleMarkPaid} disabled={paying}>{paying ? 'Marking as Paid...' : 'Mark as Paid'}</button>}
      {error && <div style={{color:'red'}}>{error}</div>}
      {order.products && Array.isArray(order.products) && order.products.length > 0 && (
        <>
          <h4>Products:</h4>
          <ul>
            {order.products.map((item, idx) => (
              <li key={idx}>{item.product?.name || 'Product'} x {item.quantity} @ {item.price}</li>
            ))}
          </ul>
        </>
      )}
      <div><strong>Delivery Location:</strong> {order.deliveryLocation || 'N/A'}</div>
      <div><strong>Delivery Option:</strong> {order.deliveryOption === 'vehicle' ? 'Vehicle' : order.deliveryOption === 'motorbike' ? 'Motor Bike' : 'N/A'}</div>
      <div><strong>Payment Method:</strong> {order.paymentMethod === 'cbe' ? 'CBE' : order.paymentMethod === 'telebirr' ? 'Telebirr' : 'N/A'}</div>
      <Link to="/orders">View My Orders</Link>
      <br />
      <Link to="/delivery-order-details" state={{ order }}>View Delivery & Price Details</Link>
    </div>
  );
};

export default OrderConfirmation;
