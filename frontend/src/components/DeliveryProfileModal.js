import React from 'react';

const DeliveryProfileModal = ({ user, onClose }) => {
  if (!user) return null;
  return (
    <div style={{position:'fixed',top:0,left:0,width:'100vw',height:'100vh',background:'rgba(0,0,0,0.4)',zIndex:4000,display:'flex',alignItems:'center',justifyContent:'center'}}>
      <div style={{background:'#fff',borderRadius:10,padding:32,minWidth:320,maxWidth:400,boxShadow:'0 2px 16px #aaa',position:'relative'}}>
        <button onClick={onClose} style={{position:'absolute',top:12,right:16,fontSize:22,background:'none',border:'none',cursor:'pointer'}}>&times;</button>
        <h3>My Profile</h3>
        <div><strong>Username:</strong> {user.username}</div>
        <div><strong>Email:</strong> {user.email}</div>
        <div><strong>Role:</strong> {user.role}</div>
        <div><strong>Status:</strong> {user.active ? 'Active' : 'Inactive'}</div>
        <div><strong>Approved:</strong> {user.approved ? 'Yes' : 'No'}</div>
        {/* Add more fields as needed */}
      </div>
    </div>
  );
};

export default DeliveryProfileModal;
