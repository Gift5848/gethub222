import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { placeOrder } from '../api/orderApi';

const CartPage = () => {
  const user = JSON.parse(localStorage.getItem('user'));
  const userId = user?._id || 'guest';
  const cartKey = `cart_${userId}`;
  const [cart, setCart] = useState([]);
  const [message, setMessage] = useState('');
  const [showCheckout, setShowCheckout] = useState(false);
  const [shippingInfo, setShippingInfo] = useState({ address: '', contact: '' });
  const [shippingMethod, setShippingMethod] = useState('standard');
  const [deliveryLocation, setDeliveryLocation] = useState('');
  const [deliveryOption, setDeliveryOption] = useState('vehicle');
  const [selectedPayment, setSelectedPayment] = useState('cbe');
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  const navigate = useNavigate();

  // Load cart for current user
  useEffect(() => {
    const storedCart = JSON.parse(localStorage.getItem(cartKey)) || [];
    setCart(storedCart);
  }, [cartKey]);

  const total = cart.reduce((sum, item) => sum + (item.price * (item.quantity || 1)), 0);

  const handlePayNow = async () => {
    const token = localStorage.getItem('token');
    if (!user || !user._id) {
      setMessage('Order failed: User not logged in.');
      return;
    }
    // Extract seller from first cart item (prefer seller, then owner)
    let seller = '';
    let debugInfo = '';
    if (cart[0]) {
      seller = cart[0].seller || cart[0].sellerId || cart[0].owner || '';
      debugInfo = `Cart[0]: ${JSON.stringify(cart[0])}, Seller resolved: ${seller}`;
    }
    if (!seller) {
      setMessage('Order failed: No seller found for cart items. ' + debugInfo);
      return;
    }
    try {
      await placeOrder({
        cart,
        buyer: user._id,
        seller,
        token
      });
      setMessage('Order placed successfully!');
      localStorage.removeItem(cartKey);
      setCart([]);
    } catch (err) {
      setMessage('Order failed: ' + (err.response?.data?.error || err.message) + ' | ' + debugInfo);
    }
  };

  const handleProceedToCheckout = () => {
    setShowCheckout(true);
  };

  const handleConfirmOrder = async () => {
    // Validate all required fields
    if (!deliveryLocation) {
      setMessage('Please enter a delivery location.');
      return;
    }
    if (!deliveryOption) {
      setMessage('Please select a delivery option.');
      return;
    }
    if (!selectedPayment) {
      setMessage('Please select a payment method.');
      return;
    }
    setIsPlacingOrder(true);
    const token = localStorage.getItem('token');
    if (!user || !user._id) {
      setMessage('Order failed: User not logged in.');
      setIsPlacingOrder(false);
      return;
    }
    let seller = '';
    let debugInfo = '';
    if (cart[0]) {
      seller = cart[0].seller || cart[0].sellerId || cart[0].owner || '';
      debugInfo = `Cart[0]: ${JSON.stringify(cart[0])}, Seller resolved: ${seller}`;
    }
    if (!seller) {
      setMessage('Order failed: No seller found for cart items. ' + debugInfo);
      setIsPlacingOrder(false);
      return;
    }
    // Get shop location/address from localStorage (set at registration/login)
    const shop = JSON.parse(localStorage.getItem('shop'));
    const shopLocation = shop?.location || '';
    const shopAddress = shop?.address || '';
    try {
      const res = await placeOrder({
        cart,
        buyer: user._id,
        seller,
        paymentMethod: selectedPayment,
        deliveryOption,
        deliveryLocation,
        shippingInfo,
        shippingMethod,
        shopLocation,
        shopAddress,
        token
      });
      setMessage('Order placed successfully!');
      localStorage.removeItem(cartKey);
      setCart([]);
      setShowCheckout(false);
      if (selectedPayment === 'telebirr' && res.data && res.data.paymentUrl) {
        const anchor = document.createElement('a');
        anchor.href = res.data.paymentUrl;
        anchor.target = '_blank';
        anchor.rel = 'noopener noreferrer';
        document.body.appendChild(anchor);
        anchor.click();
        document.body.removeChild(anchor);
      }
      // Redirect to order confirmation with order details
      if (res.data && res.data.order) {
        navigate('/order-confirmation', { state: { order: res.data.order } });
      }
    } catch (err) {
      setMessage('Order failed: ' + (err.response?.data?.error || err.message) + ' | ' + debugInfo);
    }
    setIsPlacingOrder(false);
  };

  if (cart.length === 0) return <div style={{padding: '2rem'}}><h2>Your cart is empty.</h2></div>;

  return (
    <div style={{maxWidth: 600, margin: '2rem auto', background: '#fff', borderRadius: 8, boxShadow: '0 2px 8px #eee', padding: 24}}>
      <h2>Your Cart</h2>
      {/* Debug: Show first cart item fields */}
      {cart[0] && (
        <pre style={{background:'#f8f8f8', color:'#333', padding:8, borderRadius:4, fontSize:12, marginBottom:16}}>
          Cart[0] debug: {JSON.stringify(cart[0], null, 2)}
        </pre>
      )}
      <ul style={{listStyle: 'none', padding: 0}}>
        {cart.map(item => (
          <li key={item._id} style={{marginBottom: 16, borderBottom: '1px solid #eee', paddingBottom: 8}}>
            <div style={{display: 'flex', alignItems: 'center'}}>
              {item.image && <img src={item.image} alt={item.name} style={{width: 60, height: 60, objectFit: 'cover', borderRadius: 4, marginRight: 16}} />}
              <div style={{flex: 1}}>
                <strong>{item.name}</strong><br/>
                <span>Price: ${item.price} x {item.quantity || 1}</span><br/>
                <span>Total: ${(item.price * (item.quantity || 1)).toFixed(2)}</span>
              </div>
            </div>
          </li>
        ))}
      </ul>
      <div style={{marginTop: 24, fontWeight: 'bold', fontSize: 18}}>
        Cart Total: ${total.toFixed(2)}
      </div>
      <div style={{marginTop: 24}}>
        {!showCheckout ? (
          <button
            style={{padding: '0.5rem 2rem', background: '#2980ef', color: '#fff', border: 'none', borderRadius: 4, fontSize: 16, cursor: 'pointer'}}
            onClick={handleProceedToCheckout}
          >
            Proceed to Checkout
          </button>
        ) : (
          <div style={{
            position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
            background: 'rgba(0,0,0,0.3)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <div style={{background:'#fff', borderRadius:8, padding:24, minWidth:320, maxWidth:500, width:'100%'}}>
              <h3>Checkout Process</h3>
              <div style={{marginBottom:12}}>
                <label>Shipping Address:</label><br/>
                <input value={shippingInfo.address} onChange={e => setShippingInfo({...shippingInfo, address: e.target.value})} style={{width:'100%', padding:8, borderRadius:4, marginBottom:8}} />
                <label>Contact Details:</label><br/>
                <input value={shippingInfo.contact} onChange={e => setShippingInfo({...shippingInfo, contact: e.target.value})} style={{width:'100%', padding:8, borderRadius:4}} />
              </div>
              <div style={{marginBottom:12}}>
                <label>Shipping Method:</label><br/>
                <select value={shippingMethod} onChange={e => setShippingMethod(e.target.value)} style={{padding:8, borderRadius:4, width:'100%'}}>
                  <option value="standard">Standard</option>
                  <option value="express">Express</option>
                </select>
              </div>
              <div style={{marginBottom:12}}>
                <label>Delivery Location (required):</label><br/>
                <input value={deliveryLocation} onChange={e => setDeliveryLocation(e.target.value)} style={{width:'100%', padding:8, borderRadius:4, marginBottom:8}} placeholder="Enter delivery location (address, landmark, etc)" required />
              </div>
              <div style={{marginBottom:12}}>
                <label>Delivery Option:</label><br/>
                <select value={deliveryOption} onChange={e => setDeliveryOption(e.target.value)} style={{padding:8, borderRadius:4, width:'100%'}}>
                  <option value="vehicle">Vehicle</option>
                  <option value="motorbike">Motor Bike</option>
                </select>
              </div>
              <div style={{marginBottom:12}}>
                <label>Payment Method:</label><br/>
                <select value={selectedPayment} onChange={e => setSelectedPayment(e.target.value)} style={{padding:8, borderRadius:4, width:'100%'}}>
                  <option value="cbe">CBE</option>
                  <option value="telebirr">Telebirr</option>
                </select>
              </div>
              <div style={{marginBottom:12}}>
                <strong>Order Summary:</strong><br/>
                <ul style={{listStyle:'none', padding:0}}>
                  {cart.map(item => (
                    <li key={item._id}>{item.name} x {item.quantity || 1} @ ${item.price}</li>
                  ))}
                </ul>
                <div style={{fontWeight:'bold'}}>Total: ${total.toFixed(2)}</div>
              </div>
              <button onClick={handleConfirmOrder} style={{background:'#27ae60', color:'#fff', border:'none', borderRadius:4, padding:'8px 18px', cursor:'pointer', marginRight:8}} disabled={isPlacingOrder}>{isPlacingOrder ? 'Placing Order...' : 'Confirm & Pay'}</button>
              <button onClick={()=>setShowCheckout(false)} style={{background:'#e74c3c', color:'#fff', border:'none', borderRadius:4, padding:'8px 18px', cursor:'pointer'}}>Cancel</button>
            </div>
          </div>
        )}
        {message && <div style={{marginTop: 16, color: message.startsWith('Order placed') ? 'green' : 'red'}}>{message}</div>}
      </div>
    </div>
  );
};

export default CartPage;
