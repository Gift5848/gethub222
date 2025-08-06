import React, { useEffect, useState } from 'react';
import Footer from '../components/Footer';
import '../pages/styles/main.css';
import ShopWalletSummary from './ShopWalletSummary';

const UserDashboard = () => {
  const [user, setUser] = useState({});
  const [orders, setOrders] = useState([]);

  useEffect(() => {
    // Fetch user info from localStorage or backend
    const userInfo = JSON.parse(localStorage.getItem('user')) || {};
    setUser(userInfo);
    // Fetch orders from backend (demo)
    fetch('/api/orders?userId=' + userInfo._id)
      .then(res => res.json())
      .then(data => setOrders(data))
      .catch(() => setOrders([]));
  }, []);

  return (
    <div className="dashboard-container">
      <ShopWalletSummary />
      <h2>User Dashboard</h2>
      <div className="profile-section">
        <h3>Profile Info</h3>
        <p><strong>Name:</strong> {user.name}</p>
        <p><strong>Email:</strong> {user.email}</p>
      </div>
      <div className="orders-section">
        <h3>Order Summary</h3>
        {orders.length === 0 ? (
          <p>No orders found.</p>
        ) : (
          <ul>
            {orders.map(order => (
              <li key={order._id}>
                <strong>Order #{order._id}</strong> - {order.status} - {order.total} USD
              </li>
            ))}
          </ul>
        )}
      </div>
      <Footer />
    </div>
  );
};

export default UserDashboard;
