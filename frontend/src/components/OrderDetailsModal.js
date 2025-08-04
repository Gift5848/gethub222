import React from 'react';

const OrderDetailsModal = ({ order, onClose }) => {
  if (!order) return null;
  return (
    <div style={{position:'fixed',top:0,left:0,width:'100vw',height:'100vh',background:'rgba(0,0,0,0.4)',zIndex:3000,display:'flex',alignItems:'center',justifyContent:'center'}}>
      <div style={{background:'#fff',borderRadius:10,padding:32,minWidth:340,maxWidth:500,boxShadow:'0 2px 16px #aaa',position:'relative'}}>
        <button onClick={onClose} style={{position:'absolute',top:12,right:16,fontSize:22,background:'none',border:'none',cursor:'pointer'}}>&times;</button>
        <h3>Order Details</h3>
        <div><strong>Order ID:</strong> {order._id}</div>
        <div><strong>Status:</strong> {order.status}</div>
        <div><strong>Total:</strong> ${order.total}</div>
        <div><strong>Date:</strong> {order.createdAt ? new Date(order.createdAt).toLocaleString() : ''}</div>
        <div><strong>Buyer:</strong> {order.buyer?.username || order.buyer?.email || 'N/A'}</div>
        <div><strong>Products:</strong>
          <ul>
            {order.products.map((item, idx) => (
              <li key={idx}>{item.product?.name || item.product} x {item.quantity} @ {item.price}</li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
};

export default OrderDetailsModal;
