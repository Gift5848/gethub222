import React, { useState, useRef } from 'react';
import { BrowserRouter as Router, Route, Switch } from 'react-router-dom';
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
import PrivateRoute from './components/PrivateRoute'; // Import PrivateRoute
import Checkout from './components/Checkout';
import Wishlist from './pages/Wishlist'; // Import Wishlist page
import Orders from './pages/Orders'; // Import Orders page
import MyOrders from './pages/MyOrders';
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

  const handleDrag = (e) => {
    if (!dragging) return;
    const deltaY = e.clientY - startY;
    contentRef.current.scrollTop = startScroll + deltaY * 2;
  };

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
  }, [dragging]);

  return (
    <div
      style={{
        background: '#fff', padding: '2.5rem 2rem 2rem', borderRadius: 12, minWidth: 370, maxWidth: '95vw', position: 'fixed', boxShadow: '0 8px 32px rgba(44,62,80,0.18)',
        animation: 'modalSlideIn .35s cubic-bezier(.4,2,.6,1)', left: '50%', top: '15%', transform: 'translate(-50%, 0)', zIndex: 2100
      }}
    >
      <div
        className="modal-vertical-bar"
        style={{ position: 'absolute', top: 18, right: 0, width: 8, height: 'calc(100% - 36px)', background: 'linear-gradient(180deg, #e74c3c 0%, #2980ef 100%)', borderRadius: 4, cursor: 'ns-resize', zIndex: 2200 }}
        title="Slide bar"
        onMouseDown={handleDragStart}
      />
      <button onClick={onClose} style={{ position: 'absolute', top: 18, right: 18, background: 'none', border: 'none', fontSize: 28, color: '#888', cursor: 'pointer', fontWeight: 700 }}>&times;</button>
      <div ref={contentRef} style={{ maxHeight: '60vh', overflowY: 'auto', paddingRight: 12 }}>
        {children}
      </div>
    </div>
  );
}

function App() {
  const [showCart, setShowCart] = useState(false);
  const [showAuth, setShowAuth] = useState(false);
  const [authMode, setAuthMode] = useState('login');
  const [cartCount, setCartCount] = useState(() => {
    const cart = JSON.parse(localStorage.getItem('cart')) || [];
    return cart.reduce((sum, item) => sum + (item.quantity || 1), 0);
  });
  const [showChat, setShowChat] = useState(false);

  const handleAuthClick = (mode) => {
    setAuthMode(mode);
    setShowAuth(true);
  };

  // Show cart only when add to cart is clicked
  const handleAddToCart = () => {
    setShowCart(true);
  };

  const handleChatClick = () => {
    setShowChat(true);
  };

  return (
    <Router>
      {/* Only show Header on non-admin and non-subadmin routes */}
      <Route
        path={["/admin", "/subadmin"]}
        render={() => null}
      />
      <Route
        path={["/", "/about", "/contact", "/post", "/profile", "/cart", "/wishlist", "/orders"]}
        render={() => (
          <Header 
            onLoginClick={() => handleAuthClick('login')}
            onRegisterClick={() => handleAuthClick('register')}
            onCartClick={() => setShowCart(true)} 
            onCartCount={cartCount} 
            onChatClick={handleChatClick}
          />
        )}
      />
      <Switch>
        <Route exact path="/">
          <Home onAddToCart={handleAddToCart} cartCount={cartCount} setCartCount={setCartCount} />
        </Route>
        <Route path="/about">
          <About />
        </Route>
        <Route path="/contact">
          <Contact />
        </Route>
        <Route path="/post">
          <Post />
        </Route>
        <Route path="/profile">
          <Profile />
        </Route>
        <Route path="/admin">
          <AdminPage />
        </Route>
        <Route path="/cart">
          <CartPage />
        </Route>
        <Route path="/reset-password/:token">
          <ResetPassword />
        </Route>
        <Route path="/subadmin">
          <SubAdminDashboard />
        </Route>
        <Route path="/checkout">
          <Checkout />
        </Route>
        <Route path="/wishlist">
          <Wishlist />
        </Route>
        <Route path="/orders">
          <Orders />
        </Route>
        <Route path="/orders/my" component={MyOrders} />
      </Switch>
      {showCart && (
        <div className="cart-sidebar-overlay" onClick={() => setShowCart(false)}>
          <Cart onClose={() => setShowCart(false)} onCartCountChange={setCartCount} />
        </div>
      )}
      {showAuth && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000
        }}>
          <SlideBarModal onClose={() => { setShowAuth(false); window.location.href = '/'; }}>
            {authMode === 'login' ? (
              <Auth 
                onSuccess={() => setShowAuth(false)}
                onSwitchToRegister={() => setAuthMode('register')}
              />
            ) : (
              <Register 
                onSuccess={() => setShowAuth(false)}
                onSwitchToLogin={() => setAuthMode('login')}
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

export default App;