import React, { useEffect, useRef, useState } from 'react';

const GOOGLE_MAPS_API_KEY = 'AIzaSyB8pbLVvoAFEkVCXyOiasOYZ36YEmdJwpU';
const PER_KM_RATE = 30; // Example: 30 ETB per km

function getDistanceFromLatLonInKm(lat1, lon1, lat2, lon2) {
  const R = 6371; // Radius of the earth in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

const DeliveryOrderDetails = ({ order }) => {
  const mapRef = useRef(null);
  const [distance, setDistance] = useState(null);
  const [price, setPrice] = useState(null);
  const [partsTotal, setPartsTotal] = useState(0);

  useEffect(() => {
    if (!order?.shopLocation || !order?.deliveryLocation) return;
    const [shopLat, shopLng] = order.shopLocation.split(',').map(Number);
    const [buyerLat, buyerLng] = order.deliveryLocation.split(',').map(Number);
    const dist = getDistanceFromLatLonInKm(shopLat, shopLng, buyerLat, buyerLng);
    setDistance(dist);
    setPrice(Math.ceil(dist * PER_KM_RATE));
    renderMap(shopLat, shopLng, buyerLat, buyerLng);
    // eslint-disable-next-line
  }, [order]);

  useEffect(() => {
    if (order && order.cart && Array.isArray(order.cart)) {
      const total = order.cart.reduce((sum, item) => sum + (item.price * (item.quantity || 1)), 0);
      setPartsTotal(total);
    }
  }, [order]);

  function renderMap(shopLat, shopLng, buyerLat, buyerLng) {
    const map = new window.google.maps.Map(mapRef.current, {
      center: { lat: (shopLat + buyerLat) / 2, lng: (shopLng + buyerLng) / 2 },
      zoom: 13,
    });
    new window.google.maps.Marker({ position: { lat: shopLat, lng: shopLng }, map, label: 'Shop' });
    new window.google.maps.Marker({ position: { lat: buyerLat, lng: buyerLng }, map, label: 'Buyer' });
    new window.google.maps.Polyline({
      path: [
        { lat: shopLat, lng: shopLng },
        { lat: buyerLat, lng: buyerLng }
      ],
      geodesic: true,
      strokeColor: '#4285F4',
      strokeOpacity: 0.8,
      strokeWeight: 4,
      map
    });
  }

  if (!order) return <div>No order selected.</div>;

  return (
    <div style={{maxWidth: 600, margin: '40px auto', background: '#fff', borderRadius: 8, boxShadow: '0 2px 8px #eee', padding: 24}}>
      <h2>Delivery Order Details</h2>
      <div ref={mapRef} style={{width:'100%', height:300, borderRadius:8, marginBottom:16}}></div>
      <div><strong>Shop Address:</strong> {order.shopAddress || order.shopLocation}</div>
      <div><strong>Buyer Address:</strong> {order.deliveryLocation}</div>
      {distance !== null && <div><strong>Distance:</strong> {distance.toFixed(2)} km</div>}
      {price !== null && <div><strong>Estimated Delivery Price:</strong> {price} ETB</div>}
      {partsTotal > 0 && <div><strong>Parts Total:</strong> {partsTotal} ETB</div>}
      {price !== null && partsTotal > 0 && <div style={{fontWeight:'bold',marginTop:8}}><strong>Grand Total:</strong> {price + partsTotal} ETB</div>}
    </div>
  );
};

export default DeliveryOrderDetails;
