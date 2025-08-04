import React, { useEffect, useState, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { io } from 'socket.io-client';

const Header = ({ onLoginClick, onRegisterClick, onCartClick, onCartCount, onChatClick }) => {
  const location = useLocation();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userEmail, setUserEmail] = useState('');
  const [notifications, setNotifications] = useState([]);
  const [notifCount, setNotifCount] = useState(0);
  const [showNotifDropdown, setShowNotifDropdown] = useState(false);
  const [chatUnread, setChatUnread] = useState(0);
  const [search, setSearch] = useState('');
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const profileRef = useRef();
  const [userName, setUserName] = useState('');
  const [userAvatar, setUserAvatar] = useState('');

  useEffect(() => {
    const checkLogin = () => {
      setIsLoggedIn(!!localStorage.getItem('token'));
      setUserEmail(localStorage.getItem('userEmail') || '');
    };
    checkLogin();
    window.addEventListener('storage', checkLogin);
    // Also check on every render (for SPA navigation)
    return () => window.removeEventListener('storage', checkLogin);
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

  // Chat unread count
  useEffect(() => {
    const fetchChatUnread = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) return setChatUnread(0);
        // Use backend unread-count endpoint
        const res = await fetch('/api/messages/unread-count', {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        setChatUnread(data.unreadCount || 0);
      } catch {
        setChatUnread(0);
      }
    };
    fetchChatUnread();
    const interval = setInterval(fetchChatUnread, 10000); // Poll every 10s

    // --- Socket.IO real-time unread update ---
    const user = JSON.parse(localStorage.getItem('user'));
    let socket;
    if (user && user._id) {
      socket = io('http://localhost:5000', { transports: ['websocket'] });
      socket.emit('join', user._id);
      socket.on('newMessage', (data) => {
        if (data.to === user._id) {
          fetchChatUnread();
        }
      });
    }
    return () => {
      clearInterval(interval);
      if (socket) socket.disconnect();
    };
  }, []);

  // In-app order notifications (Chapa payment)
  useEffect(() => {
    const user = JSON.parse(localStorage.getItem('user'));
    let socket;
    if (user && user._id) {
      socket = io('http://localhost:5000', { transports: ['websocket'] });
      socket.emit('join', user._id);
      socket.on('orderNotification', (data) => {
        // Save notification to localStorage
        const notifs = JSON.parse(localStorage.getItem('notifications')) || [];
        notifs.unshift({
          type: data.type,
          orderId: data.orderId,
          message: data.message,
          read: false,
          createdAt: new Date().toISOString()
        });
        localStorage.setItem('notifications', JSON.stringify(notifs));
        setNotifications(notifs);
        setNotifCount(notifs.filter(n => !n.read).length);
        // Optionally show a toast or alert
        alert(data.message);
      });
    }
    return () => { if (socket) socket.disconnect(); };
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('userEmail');
    localStorage.removeItem('user');
    setIsLoggedIn(false);
    setUserEmail('');
    window.location.reload();
  };

  const onNotifClick = () => setShowNotifDropdown(v => !v);

  // --- All useEffect hooks should be above this line ---
  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e) {
      if (profileRef.current && !profileRef.current.contains(e.target)) {
        setShowProfileDropdown(false);
      }
    }
    if (showProfileDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    } else {
      document.removeEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showProfileDropdown]);

  // Hide header on /admin and /subadmin routes
  if (location.pathname === '/admin' || location.pathname === '/subadmin') {
    return null;
  }

  // Define a minimal badge style (no background, just red text)
  const badgeStyle = {
    position: 'absolute',
    top: -12,
    right: -2,
    color: '#fff',
    fontSize: 15,
    fontWeight: 700,
    background: 'none',
    border: 'none',
    boxShadow: 'none',
    minWidth: 0,
    padding: 0,
    lineHeight: '1',
    zIndex: 2
  };

  return (
    <header style={{ background: 'linear-gradient(90deg, #c0c0c0 0%, #ad5a5a 100%)', color: '#fff', padding: 0, boxShadow: '0 2px 8px #23232322', position: 'relative', zIndex: 100 }}>
      <div style={{ display: 'flex', alignItems: 'center', padding: '0.5rem 2vw', justifyContent: 'space-between' }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
          <a href="/" style={{ display: 'flex', alignItems: 'center' }}>
            <img src="/mekina-mart-logo.png.png" alt="Mekina Mart Logo" style={{ height: 90, marginRight: 20, cursor: 'pointer' }} />
          </a>
          <span style={{ fontWeight: 800, fontSize: 22, letterSpacing: 1, color: '#fff' }}>Mekina Mart</span>
        </div>
        {/* Centered Search Bar */}
        <div style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
          <form onSubmit={e => { e.preventDefault(); window.location.href = `/search?q=${encodeURIComponent(search)}`; }} style={{ width: '100%', maxWidth: 540, display: 'flex', alignItems: 'center', background: '#fff', borderRadius: 8, boxShadow: '0 2px 8px #23294611' }}>
            <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search for parts, brands, etc..." style={{ flex: 1, border: 'none', outline: 'none', padding: '0.7rem 1rem', fontSize: 16, borderRadius: 8, background: 'transparent' }} />
            <button type="submit" style={{ background: '#8e44ad', border: 'none', color: '#fff', padding: '0.7rem 1.2rem', borderRadius: '0 8px 8px 0', fontWeight: 700, fontSize: 16, cursor: 'pointer' }}>
              <img src="/search-icon.svg" alt="Search" style={{ width: 18, height: 18, display: 'block', filter: 'invert(1)' }} />
            </button>
          </form>
        </div>
        {/* User/Cart/Account Area */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
          <span className="notification-bell" title="Notifications" onClick={onNotifClick} style={{ position: 'relative', cursor: 'pointer' }}>
            <img src="/notification-bell.svg" alt="Notifications" style={{ width: 22, height: 22, display: 'block', filter: 'invert(1)' }} />
            {notifCount > 0 && (
              <span style={badgeStyle}>{notifCount}</span>
            )}
          </span>
          <button onClick={onCartClick} style={{ background: 'none', border: 'none', color: '#fff', fontWeight: 700, fontSize: 18, display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', position: 'relative' }}>
            <img src="/cart-icon.svg" alt="Cart" style={{ width: 28, height: 28, display: 'block', filter: 'invert(1)' }} />
            <span style={badgeStyle}>{onCartCount || 0}</span>
          </button>
          {!isLoggedIn ? (
            <>
              <button onClick={onLoginClick} style={{ background: '#232946', color: '#fff', border: '1.5px solid #fff', borderRadius: 6, padding: '0.4rem 1.2rem', fontWeight: 700, fontSize: 16, marginLeft: 8, cursor: 'pointer' }}>Login</button>
              <button onClick={onRegisterClick} style={{ background: '#8e44ad', color: '#fff', border: 'none', borderRadius: 6, padding: '0.4rem 1.2rem', fontWeight: 700, fontSize: 16, marginLeft: 8, cursor: 'pointer' }}>Register</button>
            </>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, position: 'relative' }} ref={profileRef}>
              <div onClick={() => setShowProfileDropdown(v => !v)} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 0 }}>
                {userAvatar ? (
                  <img src={userAvatar} alt="avatar" style={{ width: 38, height: 38, borderRadius: '50%', objectFit: 'cover', border: '2px solid #fff', background: '#eee' }} />
                ) : (
                  <div style={{ width: 38, height: 38, borderRadius: '50%', background: '#ad5a5a', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 18, border: '2px solid #fff' }}>
                    {userName ? userName.split(' ').map(w => w[0]).join('').toUpperCase().slice(0,2) : 'U'}
                  </div>
                )}
              </div>
              {showProfileDropdown && (
                <div style={{ position: 'absolute', top: 48, right: 0, background: '#fff', border: '1px solid #eee', borderRadius: 8, boxShadow: '0 2px 12px #23294622', minWidth: 210, zIndex: 100, padding: 12 }}>
                  <div style={{ fontWeight: 700, color: '#232946', fontSize: 15, marginBottom: 6 }}>{userName}</div>
                  <div style={{ color: '#888', fontSize: 14, marginBottom: 10 }}>{userEmail}</div>
                  <a href="/profile" style={{ display: 'block', color: '#8e44ad', fontWeight: 600, fontSize: 15, marginBottom: 10, textDecoration: 'none' }}>Settings</a>
                  <button onClick={handleLogout} style={{ background: '#e74c3c', color: '#fff', border: 'none', borderRadius: 6, padding: '0.4rem 1.2rem', fontWeight: 700, fontSize: 15, cursor: 'pointer', width: '100%' }}>Logout</button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      {/* Navigation Bar */}
      <nav style={{ background: 'rgba(44,62,80,0.98)', color: '#fff', display: 'flex', alignItems: 'center', padding: '0.3rem 2vw', fontSize: 17, fontWeight: 600, gap: 18, borderTop: '1px solid #232946', borderBottom: '2px solid #8e44ad', boxShadow: '0 2px 8px #23294611' }}>
        <a href="/" style={{ color: '#fff', margin: '0 0.7rem', textDecoration: 'none', fontWeight: 700 }}>Home</a>
        <a href="#products-section" style={{ color: '#fff', margin: '0 0.7rem', textDecoration: 'none' }}>Products</a>
        <a href="/about" style={{ color: '#fff', margin: '0 0.7rem', textDecoration: 'none' }}>About</a>
        <a href="/contact" style={{ color: '#fff', margin: '0 0.7rem', textDecoration: 'none' }}>Contact</a>
        <a href="/post" style={{ color: '#fff', margin: '0 0.7rem', textDecoration: 'none' }}>Post</a>
        <a href="/wishlist" style={{ color: '#fff', margin: '0 0.7rem', textDecoration: 'none' }}>Wishlist</a>
        <a href="/orders" style={{ color: '#fff', margin: '0 0.7rem', textDecoration: 'none' }}>Orders</a>
        {isLoggedIn && (
          <a href="/profile" style={{ color: '#fff', margin: '0 0.7rem', textDecoration: 'none' }}>Profile</a>
        )}
        {isLoggedIn && (
          <a href="/chat-inbox" style={{ color: '#fff', margin: '0 0.7rem', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 6, position: 'relative' }}>
            <i className="fas fa-comments" style={{ fontSize: 16 }}></i> 
            {chatUnread > 0 && (
              <span style={badgeStyle}>{chatUnread}</span>
            )}
          </a>
        )}
      </nav>
      {/* Notification dropdown */}
      {showNotifDropdown && (
        <div style={{ position: 'absolute', right: 30, top: 60, background: '#fff', border: '1px solid #eee', borderRadius: 8, boxShadow: '0 2px 12px #0984e322', minWidth: 260, zIndex: 100 }}>
          <div style={{ fontWeight: 700, padding: '8px 12px', borderBottom: '1px solid #eee', color: '#232946' }}>Notifications</div>
          {notifications.length === 0 ? (
            <div style={{ padding: '12px', color: '#888' }}>No notifications.</div>
          ) : notifications.map((n, idx) => (
            <div key={idx} style={{ padding: '10px 12px', borderBottom: '1px solid #eee', fontSize: 15, color: n.read ? '#888' : '#232946' }}>{n.message}</div>
          ))}
        </div>
      )}
    </header>
  );
};

export default Header;
