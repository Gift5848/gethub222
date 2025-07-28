import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';

const Header = ({ onLoginClick, onRegisterClick, onCartClick, onCartCount, onChatClick }) => {
  const location = useLocation();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userEmail, setUserEmail] = useState('');
  const [notifications, setNotifications] = useState([]);
  const [notifCount, setNotifCount] = useState(0);
  const [showNotifDropdown, setShowNotifDropdown] = useState(false);

  useEffect(() => {
    setIsLoggedIn(!!localStorage.getItem('token'));
    setUserEmail(localStorage.getItem('userEmail') || '');
  }, []);

  useEffect(() => {
    // Example: fetch notifications from localStorage or backend
    const notifs = JSON.parse(localStorage.getItem('notifications')) || [];
    setNotifications(notifs);
    setNotifCount(notifs.filter(n => !n.read).length);
  }, [showNotifDropdown]);

  // Real-time notification polling (demo)
  useEffect(() => {
    const interval = setInterval(() => {
      const notifs = JSON.parse(localStorage.getItem('notifications')) || [];
      setNotifications(notifs);
      setNotifCount(notifs.filter(n => !n.read).length);
    }, 5000); // Poll every 5 seconds
    return () => clearInterval(interval);
  }, []);

  // Admin notification polling (demo)
  useEffect(() => {
    const user = JSON.parse(localStorage.getItem('user'));
    if (user?.role === 'admin') {
      const interval = setInterval(() => {
        // Replace with backend fetch for admin notifications
        const adminNotifs = JSON.parse(localStorage.getItem('adminNotifications')) || [];
        setNotifications(adminNotifs);
        setNotifCount(adminNotifs.filter(n => !n.read).length);
      }, 5000);
      return () => clearInterval(interval);
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('userEmail');
    setIsLoggedIn(false);
    setUserEmail('');
    window.location.reload();
  };

  const onNotifClick = () => setShowNotifDropdown(v => !v);

  // Hide header on /admin and /subadmin routes
  if (location.pathname === '/admin' || location.pathname === '/subadmin') {
    return null;
  }

  return (
    <header style={{ background: '#2c3e50', color: '#fff', padding: '1rem 0', textAlign: 'center' }}>
      <h1 style={{ color: '#fff' }}>Automotive Spare Parts Store</h1>
      <nav style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'center', alignItems: 'center', flexWrap: 'wrap' }}>
        <a href="/" style={{ color: '#fff', margin: '0 1rem', textDecoration: 'underline' }}>Home</a>
        <a href="#products-section" style={{ color: '#fff', margin: '0 1rem' }}>Products</a>
        <a href="/about" style={{ color: '#fff', margin: '0 1rem' }}>About</a>
        <a href="/contact" style={{ color: '#fff', margin: '0 1rem' }}>Contact</a>
        <a href="/post" style={{ color: '#fff', margin: '0 1rem' }}>Post</a>
        <a href="/wishlist" style={{ color: '#fff', margin: '0 1rem' }}>Wishlist</a>
        <a href="/orders" style={{ color: '#fff', margin: '0 1rem' }}>Orders</a>
        <a href="/orders/my" style={{ color: '#fff', margin: '0 1rem' }}>My Orders</a>
        {isLoggedIn && (
          <a href="/profile" style={{ color: '#fff', margin: '0 1rem', textDecoration: 'underline' }}>Profile</a>
        )}
        {!isLoggedIn ? (
          <>
            <button onClick={onLoginClick} style={{ margin: '0 0.5rem', padding: '0.3rem 1rem', background: '#3498db', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer' }}>Login</button>
            <button onClick={onRegisterClick} style={{ margin: '0 0.5rem', padding: '0.3rem 1rem', background: '#8e44ad', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer' }}>Register</button>
          </>
        ) : (
          <button onClick={handleLogout} style={{ margin: '0 1rem', padding: '0.3rem 1rem', background: '#e74c3c', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer' }}>Logout</button>
        )}
        <button onClick={onCartClick} style={{ margin: '0 1rem', padding: '0.3rem 1rem', background: '#27ae60', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer' }}>
          Cart ({onCartCount || 0})
        </button>
        {isLoggedIn && userEmail && (
          <span style={{ marginLeft: '1.5rem', fontWeight: 'bold', fontSize: '1rem', color: '#fff' }}>
            Signed in as {userEmail}
          </span>
        )}
        {isLoggedIn && (
          <button onClick={onChatClick} style={{ margin: '0 1rem', padding: '0.3rem 1rem', background: '#3a6cf6', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
            <i className="fas fa-comments" style={{ fontSize: 16 }}></i> Chat
          </button>
        )}
        <span className="notification-bell" title="Notifications" onClick={onNotifClick} style={{position: 'relative', margin: '0 1rem', cursor: 'pointer'}}>
          <i className="fas fa-bell" style={{ fontSize: 20, color: '#fff' }}></i>
          {notifCount > 0 && (
            <span style={{position: 'absolute', top: -6, right: -6, background: '#e74c3c', color: '#fff', borderRadius: '50%', fontSize: 12, padding: '2px 6px', fontWeight: 700}}>{notifCount}</span>
          )}
        </span>
        {/* Notification dropdown */}
        {showNotifDropdown && (
          <div style={{position: 'absolute', right: 0, top: 40, background: '#fff', border: '1px solid #eee', borderRadius: 8, boxShadow: '0 2px 12px #0984e322', minWidth: 260, zIndex: 100}}>
            <div style={{fontWeight:700, padding: '8px 12px', borderBottom: '1px solid #eee'}}>Notifications</div>
            {notifications.length === 0 ? (
              <div style={{padding: '12px', color: '#888'}}>No notifications.</div>
            ) : notifications.map((n, idx) => (
              <div key={idx} style={{padding: '10px 12px', borderBottom: '1px solid #eee', fontSize: 15, color: n.read ? '#888' : '#222'}}>{n.message}</div>
            ))}
          </div>
        )}
      </nav>
    </header>
  );
};

export default Header;
