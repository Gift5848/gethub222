import React, { useState, useRef } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import Home from './pages/Home';
import Auth from './components/Auth';
import Register from './components/Register';
import CartPage from './pages/CartPage';
import Header from './components/Header';
import About from './pages/About';
import Contact from './pages/Contact';
import Post from './pages/Post';
import Cart from './components/Cart';
import AdminPage from './pages/AdminPage';
import SubAdminDashboard from './pages/SubAdminDashboard';
import Profile from './pages/Profile';
import ResetPassword from './pages/ResetPassword';
import Checkout from './components/Checkout';
import Wishlist from './pages/Wishlist'; // Import Wishlist page
import Orders from './pages/Orders'; // Import Orders page
import DeliveryDashboard from './pages/DeliveryDashboard';
import DeliveryLogin from './pages/DeliveryLogin';
import RequireAuth from './pages/RequireAuth';
import OrderConfirmation from './pages/OrderConfirmation'; // Import OrderConfirmation page
import CheckoutPage from './pages/CheckoutPage';
import ShopRegister from './pages/ShopRegister'; // Import ShopRegister page
import DeliveryOrderDetails from './pages/DeliveryOrderDetails'; // Import DeliveryOrderDetails page
import ChatInbox from './pages/ChatInbox'; // Import ChatInbox page
import PaymentSuccess from './pages/PaymentSuccess'; // Import PaymentSuccess page
import './styles/main.css';

// SlideBarModal component (no drag logic, just a visible bar)
function SlideBarModal({ children, onClose }) {
  const contentRef = useRef(null);
  const [dragging, setDragging] = useState(false);
  const [startY, setStartY] = useState(0);
  const [startScroll, setStartScroll] = useState(0);

  const handleDragStart = (e) => {
    setDragging(true);
    setStartY(e.clientY);
    setStartScroll(contentRef.current.scrollTop);
    document.body.style.userSelect = 'none';
  };

  const handleDrag = React.useCallback((e) => {
    if (!dragging) return;
    const deltaY = e.clientY - startY;
    contentRef.current.scrollTop = startScroll + deltaY * 2;
  }, [dragging, startY, startScroll]);

  const handleDragEnd = () => {
    setDragging(false);
    document.body.style.userSelect = '';
  };

  React.useEffect(() => {
    if (dragging) {
      window.addEventListener('mousemove', handleDrag);
      window.addEventListener('mouseup', handleDragEnd);
    } else {
      window.removeEventListener('mousemove', handleDrag);
      window.removeEventListener('mouseup', handleDragEnd);
    }
    return () => {
      window.removeEventListener('mousemove', handleDrag);
      window.removeEventListener('mouseup', handleDragEnd);
    };
  }, [dragging, handleDrag]);

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        background: 'rgba(0,0,0,0.18)', // subtle dark overlay
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 2000
      }}
    >
      <div
        style={{
          background: '#fff',
          padding: '2.5rem 2rem 2rem',
          borderRadius: 18,
          minWidth: 370,
          maxWidth: '95vw',
          position: 'relative',
          boxShadow: '0 8px 32px rgba(44,62,80,0.18)',
          zIndex: 2100,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div
          className="modal-vertical-bar"
          style={{ position: 'absolute', top: 18, right: 0, width: 8, height: 'calc(100% - 36px)', background: 'linear-gradient(180deg, #e74c3c 0%, #2980ef 100%)', borderRadius: 4, cursor: 'ns-resize', zIndex: 2200 }}
          title="Slide bar"
          onMouseDown={handleDragStart}
        />
        <button onClick={onClose} style={{ position: 'absolute', top: 18, right: 18, background: 'none', border: 'none', fontSize: 28, color: '#888', cursor: 'pointer', fontWeight: 700 }}>&times;</button>
        <div ref={contentRef} style={{ maxHeight: '60vh', overflowY: 'auto', paddingRight: 12, width: '100%' }}>
          {children}
        </div>
      </div>
    </div>
  );
}

function App() {
  const [showCart, setShowCart] = useState(false);
  const [showAuth, setShowAuth] = useState(false);
  const [authMode, setAuthMode] = useState('login');
  const user = JSON.parse(localStorage.getItem('user'));
  const userId = user?._id || 'guest';
  const cartKey = `cart_${userId}`;
  const [cartCount, setCartCount] = useState(() => {
    const cart = JSON.parse(localStorage.getItem(cartKey)) || [];
    return cart.reduce((sum, item) => sum + (item.quantity || 1), 0);
  });
  const [showChat, setShowChat] = useState(false);
  const location = window.location.pathname;

  const handleAuthClick = (mode) => {
    setAuthMode(mode);
    setShowAuth(true);
  };

  // Show cart only when add to cart is clicked
  const handleAddToCart = () => {
    setShowCart(true);
    console.log('Cart button clicked: showCart set to true');
  };

  const handleCartClick = () => {
    setShowCart(true);
    console.log('Header cart button clicked: showCart set to true');
  };

  const handleChatClick = () => {
    setShowChat(true);
  };

  // Only show Header on non-admin, non-subadmin, and non-delivery routes
  const showHeader = !location.startsWith('/admin') && !location.startsWith('/subadmin') && !location.startsWith('/delivery');

  return (
    <Router>
      {showHeader && (
        <Header 
          onLoginClick={() => handleAuthClick('login')}
          onRegisterClick={() => handleAuthClick('register')}
          onCartClick={handleCartClick}
          onCartCount={cartCount} 
          onChatClick={handleChatClick}
        />
      )}
      <Routes>
        <Route path="/" element={<Home onAddToCart={handleAddToCart} cartCount={cartCount} setCartCount={setCartCount} />} />
        <Route path="/about" element={<About />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/post" element={<Post />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/admin" element={<AdminPage />} />
        <Route path="/cart" element={<CartPage />} />
        <Route path="/reset-password/:token" element={<ResetPassword />} />
        <Route path="/subadmin" element={<SubAdminDashboard />} />
        <Route path="/checkout" element={<CheckoutPage />} />
        <Route path="/wishlist" element={<RequireAuth><Wishlist setCartCount={setCartCount} /></RequireAuth>} />
        <Route path="/orders" element={<RequireAuth><Orders /></RequireAuth>} />
        <Route path="/delivery-login" element={<DeliveryLogin />} />
        <Route path="/delivery" element={<ProtectedDeliveryDashboard />} />
        <Route path="/login" element={<Auth />} />
        <Route path="/order-confirmation" element={
          <RequireOrderInfo>
            <OrderConfirmation />
          </RequireOrderInfo>
        } /> {/* Add route for OrderConfirmation */}
        <Route path="/shop-register" element={<ShopRegister />} /> {/* Add route for ShopRegister */}
        <Route path="/delivery-order-details" element={<DeliveryOrderDetailsWrapper />} /> {/* Add route for DeliveryOrderDetails */}
        <Route path="/chat-inbox" element={<ChatInbox />} /> {/* Add route for ChatInbox */}
        <Route path="/payment-success" element={<PaymentSuccess />} /> {/* Add route for PaymentSuccess */}
      </Routes>
      {showCart && (
        <div className="cart-sidebar-overlay" style={{zIndex: 3000, display: 'block'}} onClick={() => setShowCart(false)}>
          <Cart onClose={() => setShowCart(false)} onCartCountChange={setCartCount} />
        </div>
      )}
      {showAuth && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.18)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000
        }}>
          <SlideBarModal onClose={() => { setShowAuth(false); }}>
            {authMode === 'login' ? (
              <Auth 
                onSuccess={() => setShowAuth(false)}
                onSwitchToRegister={() => setAuthMode('register')}
                isModal={true}
              />
            ) : (
              <Register 
                onSuccess={() => setShowAuth(false)}
                onSwitchToLogin={() => setAuthMode('login')}
                isModal={true}
              />
            )}
          </SlideBarModal>
          <style>{`
            @keyframes modalSlideIn {
              from { transform: translateY(100vh); opacity: 0; }
              to { transform: translateY(0); opacity: 1; }
            }
          `}</style>
        </div>
      )}
      {showChat && (
        <div style={{position:'fixed',top:0,left:0,width:'100vw',height:'100vh',background:'rgba(44,62,80,0.18)',zIndex:2200,display:'flex',alignItems:'center',justifyContent:'center'}}>
          <SlideBarModal onClose={() => setShowChat(false)}>
            <h2 style={{marginBottom:12}}>Chat</h2>
            {/* Simple info for demo: you can connect this to your chat logic or ProductList chat modal */}
            <div style={{color:'#888'}}>To chat with a seller, please open a product detail and use the chat button for user-to-user products.</div>
          </SlideBarModal>
        </div>
      )}
    </Router>
  );
}

// Protect DeliveryDashboard so only delivery role can access
function ProtectedDeliveryDashboard() {
  const user = JSON.parse(localStorage.getItem('user'));
  if (!user || user.role !== 'delivery') {
    window.location.href = '/delivery-login';
    return null;
  }
  return <DeliveryDashboard />;
}

// Guard for order confirmation route
function RequireOrderInfo({ children }) {
  const location = useLocation();
  // Only allow if order info is present in navigation state
  if (!location.state || !location.state.order) {
    window.location.href = '/cart';
    return null;
  }
  return children;
}

// Wrapper to get order from location.state
function DeliveryOrderDetailsWrapper() {
  const { state } = useLocation();
  const order = state?.order;
  return <DeliveryOrderDetails order={order} />;
}

export default App;