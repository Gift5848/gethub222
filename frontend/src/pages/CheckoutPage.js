import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const GOOGLE_MAPS_API_KEY = 'AIzaSyB8pbLVvoAFEkVCXyOiasOYZ36YEmdJwpU'; // Replace with your actual API key

const CheckoutPage = () => {
  const [deliveryLocation, setDeliveryLocation] = useState('');
  const [deliveryLatLng, setDeliveryLatLng] = useState(null);
  const [deliveryOption, setDeliveryOption] = useState('vehicle');
  const [paymentMethod, setPaymentMethod] = useState('cbe');
  const [error, setError] = useState('');
  const [mapLoaded, setMapLoaded] = useState(false);
  const [address, setAddress] = useState('');
  const [deliveryFee, setDeliveryFee] = useState(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [transactionNumber, setTransactionNumber] = useState('');
  const [pendingOrderData, setPendingOrderData] = useState(null);
  const [receiptFile, setReceiptFile] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    // Load Google Maps script only if not already loaded
    if (!window.google || !window.google.maps) {
      if (!document.getElementById('google-maps-script')) {
        const script = document.createElement('script');
        script.id = 'google-maps-script';
        script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}`;
        script.async = true;
        script.onload = () => setMapLoaded(true);
        document.body.appendChild(script);
      } else {
        // Script tag exists but google not loaded yet
        document.getElementById('google-maps-script').onload = () => setMapLoaded(true);
      }
    } else {
      setMapLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (mapLoaded) {
      // Get user's current location
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const { latitude, longitude } = pos.coords;
          initMap(latitude, longitude);
        },
        () => {
          // Default to Addis Ababa if geolocation fails
          initMap(9.03, 38.74);
        }
      );
    }
    // eslint-disable-next-line
  }, [mapLoaded]);

  useEffect(() => {
    if (deliveryLatLng) {
      // Example: calculate distance from a fixed shop location (e.g., Addis Ababa center)
      const shopLat = 9.03;
      const shopLng = 38.74;
      const toRad = deg => deg * (Math.PI / 180);
      const R = 6371; // km
      const dLat = toRad(deliveryLatLng.lat - shopLat);
      const dLng = toRad(deliveryLatLng.lng - shopLng);
      const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
        Math.cos(toRad(shopLat)) * Math.cos(toRad(deliveryLatLng.lat)) *
        Math.sin(dLng/2) * Math.sin(dLng/2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
      const distance = R * c;
      // Fee: base + per km, different for vehicle/motorbike
      const base = deliveryOption === 'vehicle' ? 100 : 60;
      const perKm = deliveryOption === 'vehicle' ? 20 : 10;
      setDeliveryFee(Math.round(base + perKm * distance));
    } else {
      setDeliveryFee(null);
    }
  }, [deliveryLatLng, deliveryOption]);

  // Calculate cart total
  const user = JSON.parse(localStorage.getItem('user')) || {};
  const cartKey = `cart_${user._id || 'guest'}`;
  const cart = JSON.parse(localStorage.getItem(cartKey)) || [];
  const cartTotal = cart.reduce((sum, item) => sum + (item.price * (item.quantity || 1)), 0);
  const finalTotal = (cartTotal || 0) + (deliveryFee || 0);

  function initMap(lat, lng) {
    const map = new window.google.maps.Map(document.getElementById('map'), {
      center: { lat, lng },
      zoom: 15,
    });
    const marker = new window.google.maps.Marker({
      position: { lat, lng },
      map,
      draggable: true,
    });
    setDeliveryLatLng({ lat, lng });
    setDeliveryLocation(`${lat},${lng}`);
    getAddressFromLatLng(lat, lng);
    marker.addListener('dragend', function (e) {
      setDeliveryLatLng({ lat: e.latLng.lat(), lng: e.latLng.lng() });
      setDeliveryLocation(`${e.latLng.lat()},${e.latLng.lng()}`);
      getAddressFromLatLng(e.latLng.lat(), e.latLng.lng());
    });
  }

  function getAddressFromLatLng(lat, lng) {
    const geocoder = new window.google.maps.Geocoder();
    geocoder.geocode({ location: { lat, lng } }, (results, status) => {
      if (status === 'OK' && results[0]) {
        setAddress(results[0].formatted_address);
      } else {
        setAddress('');
      }
    });
  }

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!deliveryLocation) {
      setError('Please select a delivery location on the map.');
      return;
    }
    if (!deliveryOption) {
      setError('Please select a delivery option.');
      return;
    }
    if (!paymentMethod) {
      setError('Please select a payment method.');
      return;
    }
    if (paymentMethod === 'cbe' || paymentMethod === 'telebirr') {
      setShowPaymentModal(true);
      setPendingOrderData({
        deliveryLocation: address || deliveryLocation,
        deliveryLatLng,
        deliveryOption,
        paymentMethod,
      });
      return;
    }
    navigate('/order-confirmation', {
      state: {
        order: {
          deliveryLocation: address || deliveryLocation,
          deliveryLatLng,
          deliveryOption,
          paymentMethod,
        }
      }
    });
  };

  async function handlePaymentModalSubmit(e) {
    e.preventDefault();
    if (!transactionNumber) {
      setError('Please enter your transaction number.');
      return;
    }
    if (!receiptFile) {
      setError('Please upload your payment receipt.');
      return;
    }
    try {
      const user = JSON.parse(localStorage.getItem('user')) || {};
      const token = localStorage.getItem('token');
      const cartKey = `cart_${user._id || 'guest'}`;
      let cart = JSON.parse(localStorage.getItem(cartKey)) || [];
      if (!cart.length) {
        alert('Your cart is empty.');
        return;
      }
      for (let i = 0; i < cart.length; i++) {
        if (!cart[i].shopId) {
          const prodId = cart[i].product?._id || cart[i].product || cart[i]._id;
          const prodRes = await fetch(`/api/products/${prodId}`);
          const prodData = await prodRes.json();
          cart[i].shopId = prodData.shopId?._id || prodData.shopId || '';
        }
      }
      const products = cart.map(item => ({
        product: item.product?._id || item.product || item._id,
        quantity: item.quantity || 1,
        price: item.price || 0
      }));
      const seller = cart[0].seller || cart[0].sellerId || cart[0].owner;
      let shopId = cart[0].shopId || (user.shopId ? user.shopId : undefined);
      if (shopId && typeof shopId === 'object' && shopId._id) shopId = shopId._id;
      shopId = shopId ? String(shopId) : '';
      if (!seller || !shopId) {
        alert('Order creation failed: Missing seller or shopId.');
        return;
      }
      // Use FormData to send file and data
      const formData = new FormData();
      formData.append('products', JSON.stringify(products));
      formData.append('buyer', user._id);
      formData.append('seller', seller);
      formData.append('shopId', shopId);
      formData.append('deliveryLocation', pendingOrderData.deliveryLocation);
      formData.append('deliveryLatLng', JSON.stringify(pendingOrderData.deliveryLatLng));
      formData.append('deliveryOption', pendingOrderData.deliveryOption);
      formData.append('paymentMethod', pendingOrderData.paymentMethod);
      formData.append('paymentTransaction', transactionNumber);
      formData.append('total', finalTotal);
      formData.append('receipt', receiptFile);
      const orderRes = await fetch('/api/orders/with-receipt', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });
      const orderData = await orderRes.json();
      if (!orderData._id) {
        alert('Order creation failed: ' + (orderData.error || 'Unknown error'));
        return;
      }
      setShowPaymentModal(false);
      setTransactionNumber('');
      setPendingOrderData(null);
      setReceiptFile(null);
      navigate('/order-confirmation', { state: { order: orderData } });
    } catch (err) {
      alert('Order creation error: ' + err.message);
    }
  }

  return (
    <div style={{maxWidth: 500, margin: '40px auto', background: '#fff', borderRadius: 8, boxShadow: '0 2px 8px #eee', padding: 24}}>
      <h2>Checkout</h2>
      <form onSubmit={handleSubmit}>
        <div style={{marginBottom: 16}}>
          <label>Delivery Location (required):</label><br/>
          <div id="map" style={{width:'100%', height:300, borderRadius:8, marginBottom:8}}></div>
          <input value={address} readOnly style={{width:'100%', padding:8, borderRadius:4, background:'#f8f8f8', marginBottom:8}} placeholder="Select location on map" />
          <input value={deliveryLocation} readOnly style={{width:'100%', padding:8, borderRadius:4, background:'#f8f8f8'}} placeholder="Coordinates" />
        </div>
        <div style={{marginBottom: 16}}>
          <label>Delivery Option:</label><br/>
          <select value={deliveryOption} onChange={e => setDeliveryOption(e.target.value)} style={{width:'100%', padding:8, borderRadius:4}}>
            <option value="vehicle">Vehicle</option>
            <option value="motorbike">Motor Bike</option>
          </select>
          {deliveryFee !== null && (
            <div style={{marginTop:8, color:'#2980ef', fontWeight:600}}>
              Estimated Delivery Fee: ETB {deliveryFee}
            </div>
          )}
        </div>
        <div style={{marginBottom: 16}}>
          <label>Payment Method:</label><br/>
          <select value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)} style={{width:'100%', padding:8, borderRadius:4}}>
            <option value="cbe">CBE</option>
            <option value="telebirr">Telebirr</option>
            <option value="chapa">Chapa</option>
          </select>
        </div>
        <div style={{marginBottom: 16}}>
          <label>Order Summary:</label>
          <div style={{background:'#f8f8f8',padding:12,borderRadius:6,marginTop:6}}>
            <div>Items Total: <b>ETB {cartTotal}</b></div>
            <div>Estimated Delivery Fee: <b>ETB {deliveryFee !== null ? deliveryFee : '-'}</b></div>
            <div style={{marginTop:8,fontWeight:700}}>Total to Pay: <span style={{color:'#27ae60'}}>ETB {finalTotal}</span></div>
          </div>
        </div>
        {paymentMethod === 'chapa' && (
          <button
            type="button"
            style={{background:'#1e90ff',color:'#fff',fontWeight:700,padding:'10px 24px',border:'none',borderRadius:4,marginBottom:16,cursor:'pointer'}}
            onClick={async () => {
              try {
                const user = JSON.parse(localStorage.getItem('user')) || {};
                const token = localStorage.getItem('token');
                // Get cart from localStorage
                const cartKey = `cart_${user._id || 'guest'}`;
                let cart = JSON.parse(localStorage.getItem(cartKey)) || [];
                if (!cart.length) {
                  alert('Your cart is empty.');
                  return;
                }
                // Fetch shopId for each product if missing
                for (let i = 0; i < cart.length; i++) {
                  if (!cart[i].shopId) {
                    const prodId = cart[i].product?._id || cart[i].product || cart[i]._id;
                    const prodRes = await fetch(`/api/products/${prodId}`);
                    const prodData = await prodRes.json();
                    cart[i].shopId = prodData.shopId?._id || prodData.shopId || '';
                  }
                }
                // Extract products, seller, shopId
                const products = cart.map(item => ({
                  product: item.product?._id || item.product || item._id,
                  quantity: item.quantity || 1,
                  price: item.price || 0
                }));
                const seller = cart[0].seller || cart[0].sellerId || cart[0].owner;
                let shopId = cart[0].shopId || (user.shopId ? user.shopId : undefined);
                if (shopId && typeof shopId === 'object' && shopId._id) shopId = shopId._id;
                shopId = shopId ? String(shopId) : '';
                // REMOVE debug alert for shopId
                if (!seller || !shopId) {
                  alert('Order creation failed: Missing seller or shopId.');
                  return;
                }
                // 1. Create order first
                const orderRes = await fetch('/api/orders', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                  },
                  body: JSON.stringify({
                    products,
                    buyer: user._id,
                    seller,
                    shopId,
                    deliveryLocation: address || deliveryLocation,
                    deliveryLatLng,
                    deliveryOption,
                    paymentMethod,
                    total: finalTotal, // You may want to include cart total here
                  })
                });
                const orderData = await orderRes.json();
                if (!orderData._id) {
                  alert('Order creation failed: ' + (orderData.error || 'Unknown error'));
                  return;
                }
                // 2. Use order._id as tx_ref for Chapa
                const chapaRes = await fetch('/api/payment/chapa', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    amount: finalTotal,
                    currency: 'ETB',
                    email: user.email || 'test@example.com',
                    first_name: user.firstName || 'Test',
                    last_name: user.lastName || 'User',
                    tx_ref: orderData._id,
                    return_url: `${window.location.origin}/payment-success?tx_ref=${orderData._id}`
                  })
                });
                const chapaData = await chapaRes.json();
                if (chapaData.checkout_url) {
                  window.open(chapaData.checkout_url, '_blank');
                } else {
                  alert('Chapa payment failed: ' + (chapaData.error?.message || JSON.stringify(chapaData.error)));
                }
              } catch (err) {
                alert('Chapa payment error: ' + err.message);
              }
            }}
          >
            Pay with Chapa
          </button>
        )}
        {error && <div style={{color:'red', marginBottom:12}}>{error}</div>}
        <button type="submit" style={{background:'#27ae60', color:'#fff', border:'none', borderRadius:4, padding:'10px 24px', fontSize:16, cursor:'pointer'}}>Continue to Confirmation</button>
      </form>
      {showPaymentModal && (
        <div style={{position:'fixed',top:0,left:0,right:0,bottom:0,background:'rgba(0,0,0,0.4)',zIndex:200,display:'flex',alignItems:'center',justifyContent:'center'}}>
          <form onSubmit={handlePaymentModalSubmit} style={{background:'#fff',padding:32,borderRadius:12,minWidth:350,maxWidth:400,boxShadow:'0 4px 24px #23294655',position:'relative'}}>
            <h3>Submit Transaction Details</h3>
            <p style={{marginBottom:12}}>
              {paymentMethod === 'cbe' && (
                <span>
                  Please transfer to CBE Account: <b>0123456789</b>
                </span>
              )}
              {paymentMethod === 'telebirr' && (
                <span>
                  Please transfer to Telebirr Number: <b>09123456789</b>
                </span>
              )}
            </p>
            <label style={{marginBottom:8,display:'block'}}>Upload Payment Receipt:</label>
            <input type="file" accept="image/*" onChange={e => setReceiptFile(e.target.files[0])} style={{marginBottom:16}} required />
            <input type="text" value={transactionNumber} onChange={e => setTransactionNumber(e.target.value)} placeholder="Transaction Number" style={{width:'100%',padding:10,borderRadius:6,marginBottom:16}} required />
            <button type="submit" style={{background:'#27ae60',color:'#fff',padding:'10px 24px',border:'none',borderRadius:6,fontWeight:700}}>Submit Payment</button>
            <button type="button" onClick={()=>{setShowPaymentModal(false);setTransactionNumber('');}} style={{marginLeft:12,background:'#e74c3c',color:'#fff',padding:'10px 24px',border:'none',borderRadius:6}}>Cancel</button>
          </form>
        </div>
      )}
    </div>
  );
};

export default CheckoutPage;
