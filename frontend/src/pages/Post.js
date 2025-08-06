import React, { useState, useRef } from 'react';
import ProductForm from '../components/ProductForm';

// Modal with functional vertical slider bar
function StaticModal({ children, onClose }) {
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

  // Move handleDrag inside useEffect or wrap with useCallback
  const handleDrag = React.useCallback((e) => {
    if (!dragging) return;
    const deltaY = e.clientY - startY;
    contentRef.current.scrollTop = startScroll + deltaY * 2; // Adjust scroll speed as needed
  }, [dragging, startY, startScroll]);

  // Move handleDragEnd inside useEffect to avoid changing dependencies on every render
  React.useEffect(() => {
    const handleDragEnd = () => {
      setDragging(false);
      window.removeEventListener('mousemove', handleDrag);
      window.removeEventListener('mouseup', handleDragEnd);
    };
    if (dragging) {
      window.addEventListener('mousemove', handleDrag);
      window.addEventListener('mouseup', handleDragEnd);
    }
    return () => {
      window.removeEventListener('mousemove', handleDrag);
      window.removeEventListener('mouseup', handleDragEnd);
    };
  }, [dragging, handleDrag]);

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

const Post = () => {
  const [showModal, setShowModal] = useState(true);
  // Get user from localStorage (or from context if available)
  const user = JSON.parse(localStorage.getItem('user'));
  const handleClose = () => {
    setShowModal(false);
    window.location.href = '/';
  };
  if (!showModal) return null;
  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.5)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000
    }}>
      <StaticModal onClose={handleClose}>
        <h2 style={{ fontWeight: 700, fontSize: '1.5rem', marginBottom: 24, color: '#222', textAlign: 'center' }}>
          Add New Product
        </h2>
        <div style={{ margin: '0 auto', maxWidth: 370 }}>
          <ProductForm user={user} />
        </div>
      </StaticModal>
      <style>{`
        @keyframes modalSlideIn {
          from { transform: translateY(100vh); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
};

export default Post;
