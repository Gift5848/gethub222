import React from 'react';

const Footer = () => (
  <footer style={{ background: '#46617a', color: '#fff', padding: '2.5rem 0 1.5rem', textAlign: 'center', marginTop: '2rem', borderRadius: '0 0 10px 10px' }}>
    <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 32, alignItems: 'flex-start' }}>
      <div style={{ flex: 1, minWidth: 220, textAlign: 'left' }}>
        <h3 style={{ fontWeight: 700, marginBottom: 8, borderBottom: '2px solid #e74c3c', display: 'inline-block', paddingBottom: 2 }}>AutoParts Online</h3>
        <p style={{ margin: '10px 0 18px', color: '#e0e6ed', fontSize: 15 }}>Your trusted source for quality automotive spare parts with convenient online shopping and fast delivery.</p>
        <div style={{ display: 'flex', gap: 16 }}>
          {/* Social links: use button for # hrefs */}
          <button type="button" style={{ color: '#fff', fontSize: 22, background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}><i className="fab fa-facebook"></i></button>
          <button type="button" style={{ color: '#fff', fontSize: 22, background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}><i className="fab fa-twitter"></i></button>
          <button type="button" style={{ color: '#fff', fontSize: 22, background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}><i className="fab fa-instagram"></i></button>
          <button type="button" style={{ color: '#fff', fontSize: 22, background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}><i className="fab fa-linkedin"></i></button>
        </div>
      </div>
      <div style={{ flex: 1, minWidth: 180, textAlign: 'left' }}>
        <h3 style={{ fontWeight: 700, marginBottom: 8, borderBottom: '2px solid #e74c3c', display: 'inline-block', paddingBottom: 2 }}>Quick Links</h3>
        <ul style={{ listStyle: 'none', padding: 0, margin: 0, color: '#e0e6ed', fontSize: 15 }}>
          {/* Replace # hrefs in list with buttons for accessibility */}
          <li><a href="/" style={{ color: '#fff', textDecoration: 'none' }}>Home</a></li>
          <li><a href="/products" style={{ color: '#fff', textDecoration: 'none' }}>Products</a></li>
          <li><a href="/about" style={{ color: '#fff', textDecoration: 'none' }}>About Us</a></li>
          <li><a href="/contact" style={{ color: '#fff', textDecoration: 'none' }}>Contact</a></li>
          <li><button type="button" style={{ color: '#fff', textDecoration: 'none', background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}>My Account</button></li>
          <li><button type="button" style={{ color: '#fff', textDecoration: 'none', background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}>Order Tracking</button></li>
          <li><button type="button" style={{ color: '#fff', textDecoration: 'none', background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}>FAQs</button></li>
          <li><button type="button" style={{ color: '#fff', textDecoration: 'none', background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}>Shipping Policy</button></li>
          <li><button type="button" style={{ color: '#fff', textDecoration: 'none', background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}>Return Policy</button></li>
          <li><button type="button" style={{ color: '#fff', textDecoration: 'none', background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}>Privacy Policy</button></li>
          <li><button type="button" style={{ color: '#fff', textDecoration: 'none', background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}>Terms of Service</button></li>
        </ul>
      </div>
      <div style={{ flex: 1, minWidth: 220, textAlign: 'left' }}>
        <h3 style={{ fontWeight: 700, marginBottom: 8, borderBottom: '2px solid #e74c3c', display: 'inline-block', paddingBottom: 2 }}>Contact Us</h3>
        <ul style={{ listStyle: 'none', padding: 0, margin: 0, color: '#e0e6ed', fontSize: 15 }}>
          <li><span style={{ marginRight: 8 }}><i className="fas fa-map-marker-alt"></i></span>MicroLink IT College, Addis Ababa</li>
          <li><span style={{ marginRight: 8 }}><i className="fas fa-phone"></i></span>+251 911 234 567</li>
          <li><span style={{ marginRight: 8 }}><i className="fas fa-envelope"></i></span>info@autopartsonline.et</li>
          <li><span style={{ marginRight: 8 }}><i className="fas fa-clock"></i></span>Mon-Fri: 8:30 AM - 5:30 PM</li>
        </ul>
      </div>
    </div>
    <hr style={{ border: 'none', borderTop: '1px solid #7b8fa1', margin: '32px 0 18px' }} />
    <div style={{ color: '#e0e6ed', fontSize: 14, textAlign: 'center' }}>
      © 2025 AutoParts Online. All Rights Reserved. Developed by MicroLink IT College Team.
    </div>
    <button style={{ position: 'fixed', bottom: 32, right: 32, background: '#e74c3c', color: '#fff', border: 'none', borderRadius: '50%', width: 44, height: 44, fontSize: 22, boxShadow: '0 2px 8px rgba(44,62,80,0.18)', cursor: 'pointer', zIndex: 1000 }}>
      <i className="fas fa-bars"></i>
    </button>
  </footer>
);

export default Footer;
