import React, { useRef, useState } from 'react';

const ProofOfDeliveryModal = ({ order, onClose, onSubmit }) => {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const inputRef = useRef();

  const handleFileChange = e => {
    const f = e.target.files[0];
    setFile(f);
    if (f) {
      const reader = new FileReader();
      reader.onload = e2 => setPreview(e2.target.result);
      reader.readAsDataURL(f);
    } else {
      setPreview(null);
    }
  };

  const handleSubmit = e => {
    e.preventDefault();
    if (file) onSubmit(file);
  };

  if (!order) return null;
  return (
    <div style={{position:'fixed',top:0,left:0,width:'100vw',height:'100vh',background:'rgba(0,0,0,0.4)',zIndex:4000,display:'flex',alignItems:'center',justifyContent:'center'}}>
      <form onSubmit={handleSubmit} style={{background:'#fff',borderRadius:10,padding:32,minWidth:320,maxWidth:400,boxShadow:'0 2px 16px #aaa',position:'relative'}}>
        <button onClick={onClose} type="button" style={{position:'absolute',top:12,right:16,fontSize:22,background:'none',border:'none',cursor:'pointer'}}>&times;</button>
        <h3>Proof of Delivery</h3>
        <div style={{marginBottom:12}}><strong>Order ID:</strong> {order._id}</div>
        <input type="file" accept="image/*" ref={inputRef} onChange={handleFileChange} required style={{marginBottom:12}} />
        {preview && <img src={preview} alt="Preview" style={{maxWidth:'100%',maxHeight:180,marginBottom:12,borderRadius:6}} />}
        <button type="submit" style={{background:'#232946',color:'#fff',border:'none',borderRadius:6,padding:'8px 20px',fontWeight:600,cursor:'pointer'}}>Submit</button>
      </form>
    </div>
  );
};

export default ProofOfDeliveryModal;
