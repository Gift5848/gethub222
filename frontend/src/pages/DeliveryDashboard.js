import React, { useEffect, useState, useRef } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import DeliveryHeader from '../components/DeliveryHeader';
import OrderDetailsModal from '../components/OrderDetailsModal';
import DeliveryProfileModal from '../components/DeliveryProfileModal';
import DeliveryMap from '../components/DeliveryMap';
import ProofOfDeliveryModal from '../components/ProofOfDeliveryModal';
import notificationSound from '../assets/notification.mp3';
import styles from './DeliveryDashboard.module.css';

const DeliveryDashboard = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusUpdate, setStatusUpdate] = useState({});
  const [user, setUser] = useState(() => {
    return JSON.parse(localStorage.getItem('delivery_user')) || null;
  });
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [toast, setToast] = useState(null);
  const [showProfile, setShowProfile] = useState(false);
  const [showProofModal, setShowProofModal] = useState(null); // order or null
  const [geocodedOrders, setGeocodedOrders] = useState([]);
  const [geocoding, setGeocoding] = useState(false);
  const intervalRef = useRef();
  const socketRef = useRef();
  const navigate = useNavigate();

  // Fetch orders function (keep as fallback/manual refresh)
  const fetchOrders = () => {
    const token = localStorage.getItem('delivery_token');
    if (!token) {
      setError('No delivery token found. Please log in as a delivery user.');
      setLoading(false);
      navigate('/delivery-login');
      return;
    }
    axios.get('/api/orders/delivery', {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => {
        // Show toast if new order assigned
        if (orders.length && res.data.length > orders.length) {
          setToast('New order assigned!');
        }
        setOrders(res.data);
      })
      .catch(err => {
        // Always redirect to login on 400/401 error
        if (err.response && (err.response.status === 400 || err.response.status === 401)) {
          localStorage.removeItem('delivery_token');
          localStorage.removeItem('delivery_user');
          navigate('/delivery-login');
        } else {
          const msg = err.response?.data?.error || err.message || 'Failed to load orders.';
          setError(msg);
        }
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    const username = localStorage.getItem('deliveryUsername');
    setUser({ username });
    fetchOrders();
    // --- WebSocket connection for real-time updates ---
    socketRef.current = io('/', { path: '/socket.io' }); // Adjust path if needed
    socketRef.current.on('orders_update', (newOrders) => {
      setOrders(newOrders);
      setLoading(false);
    });
    socketRef.current.on('connect_error', (err) => {
      setError('WebSocket error: ' + err.message);
    });
    // Optionally, listen for new order assignment
    socketRef.current.on('order_assigned', (order) => {
      setOrders(prev => [...prev, order]);
      setToast('New order assigned!');
    });
    intervalRef.current = setInterval(fetchOrders, 300000); // fallback poll every 5min
    return () => {
      clearInterval(intervalRef.current);
      if (socketRef.current) socketRef.current.disconnect();
    };
  }, []);

  // Play sound on new order assignment
  useEffect(() => {
    if (orders.length && toast && toast.includes('assigned')) {
      const audio = new Audio(notificationSound);
      audio.play();
    }
  }, [toast, orders.length]);

  const handleStatusChange = (orderId, newStatus) => {
    setStatusUpdate({ ...statusUpdate, [orderId]: newStatus });
  };

  const updateOrder = async (orderId) => {
    const token = localStorage.getItem('delivery_token');
    try {
      await axios.patch(`/api/orders/${orderId}`, {
        status: statusUpdate[orderId]
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setOrders(orders => orders.map(o => o._id === orderId ? { ...o, status: statusUpdate[orderId] } : o));
    } catch (err) {
      alert('Failed to update order.');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('deliveryPerson');
    localStorage.removeItem('deliveryUsername');
    navigate('/delivery-login');
  };

  // Proof of delivery upload handler
  const handleProofSubmit = async (file) => {
    if (!showProofModal) return;
    const token = localStorage.getItem('delivery_token');
    const formData = new FormData();
    formData.append('proof', file);
    try {
      await axios.post(`/api/orders/${showProofModal._id}/proof`, formData, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' }
      });
      setToast('Proof of delivery uploaded!');
      setShowProofModal(null);
      fetchOrders();
    } catch (err) {
      alert('Failed to upload proof.');
    }
  };

  // Add sort state for order list
  const [orderSortOrder, setOrderSortOrder] = useState('desc'); // 'desc' for newest first

  // Filtering and search
  const filteredOrders = orders.filter(order => {
    const matchesStatus = filter === 'all' || order.status === filter;
    const matchesSearch =
      !search ||
      order._id.toLowerCase().includes(search.toLowerCase()) ||
      (order.buyer?.username && order.buyer.username.toLowerCase().includes(search.toLowerCase()));
    return matchesStatus && matchesSearch;
  });

  // Sort filtered orders by date
  const sortedOrders = [...filteredOrders].sort((a, b) => {
    const dateA = new Date(a.createdAt || 0);
    const dateB = new Date(b.createdAt || 0);
    return orderSortOrder === 'desc' ? dateB - dateA : dateA - dateB;
  });

  // --- Robust map: filter for valid coordinates, with fallback geocoding for missing lat/lng ---
  const isValidLatLng = loc => {
    if (!loc) return false;
    if (typeof loc === 'string') {
      // Try to parse as JSON or comma-separated string
      try {
        const parsed = JSON.parse(loc);
        return typeof parsed.lat === 'number' && typeof parsed.lng === 'number';
      } catch {
        // Try comma-separated
        const parts = loc.split(',').map(Number);
        return parts.length === 2 && parts.every(n => !isNaN(n));
      }
    }
    if (typeof loc === 'object' && loc !== null) {
      if ('lat' in loc && 'lng' in loc) {
        return typeof loc.lat === 'number' && typeof loc.lng === 'number';
      }
      if (Array.isArray(loc) && loc.length === 2) {
        return loc.every(n => typeof n === 'number');
      }
    }
    return false;
  };

  // --- Fallback geocoding for orders with missing coordinates ---
  const geocodeAddress = async (address) => {
    if (!address) return null;
    // Geocoding disabled: migration to OpenStreetMap/Leaflet
    return null;
  };

  // --- Real-time map update: re-geocode on orders update ---
  useEffect(() => {
    // When orders change (via WebSocket or polling), re-trigger geocoding for map
    let isMounted = true;
    const fetchGeocodes = async () => {
      setGeocoding(true);
      const promises = filteredOrders.map(async (order) => {
        let shopLoc = order.shop?.location;
        let buyerLoc = order.buyerLocation;
        let shopLatLng = isValidLatLng(shopLoc) ? shopLoc : null;
        let buyerLatLng = isValidLatLng(buyerLoc) ? buyerLoc : null;
        // Try geocoding if missing
        if (!shopLatLng && order.shop?.address) {
          shopLatLng = await geocodeAddress(order.shop.address);
        }
        if (!buyerLatLng && order.buyerAddress) {
          buyerLatLng = await geocodeAddress(order.buyerAddress);
        }
        return {
          ...order,
          shop: {
            ...order.shop,
            location: shopLatLng || order.shop?.location,
          },
          buyerLocation: buyerLatLng || order.buyerLocation,
        };
      });
      const results = await Promise.all(promises);
      if (isMounted) setGeocodedOrders(results);
      setGeocoding(false);
    };
    fetchGeocodes();
    return () => { isMounted = false; };
  }, [orders, filter, search]);

  const mapOrders = geocodedOrders.filter(order =>
    isValidLatLng(order.shop?.location) && isValidLatLng(order.buyerLocation)
  );
  const skippedOrdersCount = filteredOrders.length - mapOrders.length;

  // Stats
  const totalOrders = orders.length;
  const deliveredCount = orders.filter(o => o.status === 'delivered').length;
  const outForDeliveryCount = orders.filter(o => o.status === 'out for delivery').length;

  // Order history and analytics
  const deliveredOrders = orders.filter(o => o.status === 'delivered');
  const totalDelivered = deliveredOrders.length;
  const lastDelivered = deliveredOrders.length ? new Date(Math.max(...deliveredOrders.map(o => new Date(o.createdAt)))).toLocaleString() : 'N/A';

  // --- Delivery Progress Bar (reuse from AdminPage.js) ---
  const renderOrderProgress = (order) => {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <div><b>Status:</b> {order.status || 'N/A'}</div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <span style={{ color: ['delivery_accepted','handedover','delivered'].includes(order.status) ? 'green' : '#aaa' }}>Accepted</span>
          <span>→</span>
          <span style={{ color: order.status === 'handedover' || order.status === 'delivered' ? 'green' : '#aaa' }}>Shop Handover</span>
          <span>→</span>
          <span style={{ color: order.status === 'handedover' || order.status === 'delivered' ? 'green' : '#aaa' }}>Delivery Received</span>
          <span>→</span>
          <span style={{ color: order.status === 'delivered' ? 'green' : '#aaa' }}>Delivered</span>
        </div>
      </div>
    );
  };

  // --- Real-time geolocation tracking for delivery person ---
  useEffect(() => {
    if (!('geolocation' in navigator) || !socketRef.current) return;
    let watchId;
    function emitLocation(position) {
      const { latitude, longitude } = position.coords;
      socketRef.current.emit('delivery_location', {
        lat: latitude,
        lng: longitude,
        userId: user?._id || (user && user.id) || localStorage.getItem('delivery_user_id'),
      });
    }
    watchId = navigator.geolocation.watchPosition(emitLocation, (err) => {}, { enableHighAccuracy: true });
    return () => {
      if (watchId) navigator.geolocation.clearWatch(watchId);
    };
  }, [user]);

  // --- Listen for real-time delivery location updates ---
  const [deliveryLocations, setDeliveryLocations] = useState({});
  useEffect(() => {
    if (!socketRef.current) return;
    const handler = (data) => {
      setDeliveryLocations(prev => ({ ...prev, [data.userId]: { lat: data.lat, lng: data.lng } }));
    };
    socketRef.current.on('delivery_location_update', handler);
    return () => {
      socketRef.current.off('delivery_location_update', handler);
    };
  }, []);

  return (
    <div className={styles.dashboardContainer}>
      <DeliveryHeader onLogout={handleLogout} user={user} />
      <button onClick={() => setShowProfile(true)} style={{position:'relative',top:0,right:0,background:'#232946',color:'#fff',border:'none',borderRadius:6,padding:'6px 16px',fontWeight:600,cursor:'pointer',zIndex:1}}>My Profile</button>
      {/* Map View */}
      <DeliveryMap
        orders={mapOrders}
        onSelectOrder={setSelectedOrder}
        deliveryLocations={deliveryLocations}
        showDeliveryPopups={true}
      />
      {/* Warn if any orders skipped from map */}
      {skippedOrdersCount > 0 && (
        <div style={{color:'#b71c1c',background:'#fff3e0',padding:'8px 16px',borderRadius:6,margin:'8px 0'}}>
          {skippedOrdersCount} order(s) not shown on map due to missing or invalid location data.
        </div>
      )}
      {geocoding && (
        <div style={{color:'#1565c0',background:'#e3f2fd',padding:'8px 16px',borderRadius:6,margin:'8px 0'}}>
          Geocoding addresses for map... Some orders may appear shortly.
        </div>
      )}
      {/* Stats */}
      <div style={{display:'flex',gap:32,marginBottom:24}}>
        <div><strong>Total Orders:</strong> {totalOrders}</div>
        <div><strong>Out for Delivery:</strong> {outForDeliveryCount}</div>
        <div><strong>Delivered:</strong> {deliveredCount}</div>
      </div>
      {/* Filter and Search */}
      <div style={{display:'flex',gap:16,marginBottom:24}}>
        <select value={filter} onChange={e => setFilter(e.target.value)}>
          <option value="all">All</option>
          <option value="out for delivery">Out for Delivery</option>
          <option value="delivered">Delivered</option>
        </select>
        <input
          type="text"
          placeholder="Search by Order ID or Buyer"
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{padding:'4px 10px',borderRadius:4,border:'1px solid #ccc',minWidth:180}}
        />
        <label style={{marginLeft:8}}>Sort by:
          <select value={orderSortOrder} onChange={e => setOrderSortOrder(e.target.value)} style={{marginLeft:8}}>
            <option value="desc">Newest First</option>
            <option value="asc">Oldest First</option>
          </select>
        </label>
      </div>
      {/* Orders List */}
      <ul style={{listStyle: 'none', padding: 0, margin: 0}}>
        {sortedOrders.map(order => (
          <li key={order._id} className={styles.orderCard} onClick={() => setSelectedOrder(order)}>
            <div style={{display:'flex',alignItems:'center',gap:8,margin:'8px 0'}}>
              <span className={styles.statusBadge} style={{background:
                order.status === 'processing' ? '#f39c12' :
                order.status === 'delivery_accepted' ? '#2980b9' :
                order.status === 'handedover' ? '#8e44ad' :
                order.status === 'delivered' ? '#27ae60' :
                '#7f8c8d'}}>{order.status.replace('_',' ')}</span>
            </div>
            <div><strong>Order ID:</strong> {order._id}</div>
            <div><strong>Total:</strong> ${order.total}</div>
            <div><strong>Date:</strong> {order.createdAt ? new Date(order.createdAt).toLocaleString() : ''}</div>
            <div><strong>Shop (Pickup):</strong> {order.shop ? `${order.shop.name} (${order.shop.location || order.shop.address})` : 'N/A'}</div>
            <div><strong>Buyer (Drop):</strong> {order.buyerAddress || 'N/A'}</div>
            <div><strong>Buyer Phone:</strong> {order.buyerPhone || 'N/A'}</div>
            <div><strong>Shop location (Pickup):</strong> {order.shopLocation || 'N/A'}</div>
            <div><strong>Buyer location (Drop):</strong> {order.buyerLocation || 'N/A'}</div>
            <div><strong>Estimated Delivery Price:</strong> {order.estimatedDeliveryPrice ? `$${order.estimatedDeliveryPrice.toFixed(2)}` : 'N/A'}</div>
            <div><strong>Products:</strong>
              <ul>
                {order.products.map((item, idx) => (
                  <li key={idx}>{item.product?.name || item.product} x {item.quantity} @ {item.price}</li>
                ))}
              </ul>
            </div>
            {order.proofOfDelivery && (
              <div style={{marginTop:8}}>
                <strong>Proof of Delivery:</strong><br />
                <img src={order.proofOfDelivery} alt="Proof" style={{maxWidth:180,maxHeight:120,borderRadius:6,marginTop:4}} />
              </div>
            )}
            {/* Accept/Reject for newly assigned orders */}
            {order.status === 'processing' && (
              <div style={{marginTop:8,display:'flex',gap:12}}>
                <button className={styles.acceptBtn}
                  onClick={async e => {
                    e.stopPropagation();
                    const token = localStorage.getItem('delivery_token');
                    try {
                      await axios.post(`/api/orders/${order._id}/accept`, {}, { headers: { Authorization: `Bearer ${token}` } });
                      setOrders(orders => orders.map(o => o._id === order._id ? { ...o, status: 'delivery_accepted' } : o));
                      setToast('Order accepted for delivery.');
                    } catch (err) {
                      setToast('Failed to accept order: ' + (err.response?.data?.error || err.message));
                    }
                  }}
                >Accept</button>
                <button className={styles.rejectBtn}
                  onClick={async e => {
                    e.stopPropagation();
                    const token = localStorage.getItem('delivery_token');
                    try {
                      await axios.post(`/api/orders/${order._id}/reject`, {}, { headers: { Authorization: `Bearer ${token}` } });
                      setOrders(orders => orders.filter(o => o._id !== order._id));
                      setToast('Order rejected.');
                    } catch (err) {
                      setToast('Failed to reject order: ' + (err.response?.data?.error || err.message));
                    }
                  }}
                >Reject</button>
              </div>
            )}
            {/* Mark as Delivered button for handedover orders */}
            {order.status === 'handedover' && user && user.username && (
              <button
                onClick={e => {
                  e.stopPropagation();
                  setShowProofModal(order); // Open proof modal instead of direct PATCH
                }}
                className={styles.acceptBtn}
                style={{marginTop:8}}
              >Mark as Delivered (Upload Proof)</button>
            )}
            {/* Delivery Received button for handedover orders */}
            {order.status === 'handedover' && (
              <button className={styles.acceptBtn}
                onClick={async e => {
                  e.stopPropagation();
                  const token = localStorage.getItem('token');
                  try {
                    await axios.patch(`/api/orders/${order._id}/delivery-received`, {}, { headers: { Authorization: `Bearer ${token}` } });
                    setOrders(orders => orders.map(o => o._id === order._id ? { ...o, status: 'in_transit' } : o));
                    setToast('Confirmed received from shop.');
                  } catch (err) {
                    setToast('Failed to confirm received: ' + (err.response?.data?.error || err.message));
                  }
                }}
                style={{marginTop:8}}>Received from Shop</button>
            )}
            {/* Delivery Confirm button for handedover orders */}
            {order.status === 'handedover' && (
              <button className={styles.acceptBtn}
                onClick={async e => {
                  e.stopPropagation();
                  const token = localStorage.getItem('token');
                  try {
                    await axios.patch(`/api/orders/${order._id}/confirmed`, {}, { headers: { Authorization: `Bearer ${token}` } });
                    setOrders(orders => orders.map(o => o._id === order._id ? { ...o, status: 'confirmed' } : o));
                    setToast('Order confirmed.');
                  } catch (err) {
                    setToast('Failed to confirm: ' + (err.response?.data?.error || err.message));
                  }
                }}
                style={{marginTop:8, background:'#00b894', color:'#fff', border:'none', borderRadius:4, padding:'8px 18px', fontWeight:600}}
              >Confirm</button>
            )}
            {/* Show green confirmed button if already confirmed */}
            {order.status === 'confirmed' && (
              <button disabled style={{marginTop:8, background:'#00b894', color:'#fff', border:'none', borderRadius:4, padding:'8px 18px', fontWeight:600}}>Confirmed</button>
            )}
            {/* Buyer Received button for delivered orders */}
            {order.status === 'delivered' && (
              <button className={styles.acceptBtn}
                onClick={async e => {
                  e.stopPropagation();
                  const token = localStorage.getItem('token');
                  try {
                    await axios.patch(`/api/orders/${order._id}/buyerreceived`, {}, { headers: { Authorization: `Bearer ${token}` } });
                    setOrders(orders => orders.map(o => o._id === order._id ? { ...o, status: 'buyerreceived' } : o));
                    setToast('Order received by buyer.');
                  } catch (err) {
                    setToast('Failed to confirm receipt: ' + (err.response?.data?.error || err.message));
                  }
                }}
                style={{marginTop:8, background:'#e74c3c', color:'#fff', border:'none', borderRadius:4, padding:'8px 18px', fontWeight:600}}
              >Received</button>
            )}
            {/* Show green delivery done button if already buyerreceived */}
            {order.status === 'buyerreceived' && (
              <button disabled style={{marginTop:8, background:'#00b894', color:'#fff', border:'none', borderRadius:4, padding:'8px 18px', fontWeight:600}}>Delivery Done</button>
            )}
            <div style={{margin:'8px 0'}}>{renderOrderProgress(order)}</div>
            <div>
              <label>Update Status: </label>
              <select value={statusUpdate[order._id] || order.status} onChange={e => handleStatusChange(order._id, e.target.value)}>
                <option value="out for delivery">Out for Delivery</option>
                <option value="delivered">Delivered</option>
              </select>
              <button onClick={e => { e.stopPropagation();
                if ((statusUpdate[order._id] || order.status) === 'delivered') setShowProofModal(order);
                else updateOrder(order._id);
              }}>Update</button>
            </div>
          </li>
        ))}
      </ul>
      {/* Order Details Modal */}
      <OrderDetailsModal order={selectedOrder} onClose={() => setSelectedOrder(null)} />
      {showProfile && <DeliveryProfileModal user={user} onClose={() => setShowProfile(false)} />}
      {/* Proof of Delivery Modal */}
      <ProofOfDeliveryModal
        order={showProofModal}
        onClose={() => setShowProofModal(null)}
        onSubmit={handleProofSubmit}
      />
      {/* Toast notification */}
      {toast && (
        <div style={{position:'fixed',top:24,right:24,background:'#232946',color:'#fff',padding:'12px 24px',borderRadius:8,zIndex:4000,boxShadow:'0 2px 8px #aaa',display:'flex',alignItems:'center',gap:12}}>
          <span style={{fontWeight:700,fontSize:'1.1em'}}>
            {toast.includes('accepted') && '✅'}
            {toast.includes('rejected') && '❌'}
            {toast.includes('assigned') && '📦'}
            {toast.includes('delivered') && '🚚'}
          </span>
          <span>{toast}</span>
          <button style={{marginLeft:16,background:'none',border:'none',color:'#fff',fontWeight:700,cursor:'pointer',fontSize:'1.2em'}} onClick={()=>setToast(null)}>&times;</button>
        </div>
      )}
      {/* Delivery Analytics */}
      <div className={styles.analyticsPanel}>
        <h3 style={{marginBottom:10}}>Delivery Analytics</h3>
        <div><strong>Total Delivered:</strong> {deliveredCount}</div>
        <div><strong>Total Orders:</strong> {totalOrders}</div>
        <div><strong>Out for Delivery:</strong> {outForDeliveryCount}</div>
        <div><strong>Total Earnings (est.):</strong> ${orders.reduce((sum,o)=>sum+(o.status==='delivered'&&o.estimatedDeliveryPrice?o.estimatedDeliveryPrice:0),0).toFixed(2)}</div>
        <div><strong>Last Delivered:</strong> {lastDelivered}</div>
      </div>
      {/* Order History & Analytics */}
      <div style={{marginTop:40,background:'#f6f8fa',borderRadius:8,padding:20}}>
        <h3 style={{marginBottom:12}}>Order History & Analytics</h3>
        <div><strong>Total Delivered:</strong> {totalDelivered}</div>
        <div><strong>Last Delivered:</strong> {lastDelivered}</div>
        <div style={{marginTop:16}}>
          <strong>Delivered Orders:</strong>
          <ul style={{marginTop:8}}>
            {deliveredOrders.map(order => (
              <li key={order._id}>{order._id} - {order.createdAt ? new Date(order.createdAt).toLocaleString() : ''}</li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
};

export default DeliveryDashboard;
