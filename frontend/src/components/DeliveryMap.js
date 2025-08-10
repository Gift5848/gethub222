import React from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

const containerStyle = {
  width: '100%',
  height: '320px',
  borderRadius: 8,
  margin: '24px 0',
};

const defaultCenter = [9.03, 38.74];

const DeliveryMap = ({ orders = [], onSelectOrder, deliveryLocations = {}, showDeliveryPopups = false }) => {
  // Filter orders with lat/lng
  const ordersWithCoords = orders.filter(o => o.lat && o.lng);
  const center = ordersWithCoords.length ? [ordersWithCoords[0].lat, ordersWithCoords[0].lng] : defaultCenter;

  // Add live delivery person markers
  const deliveryMarkers = Object.entries(deliveryLocations).map(([userId, loc]) =>
    loc && loc.lat && loc.lng ? { _id: `delivery_${userId}`, lat: loc.lat, lng: loc.lng, isDeliveryPerson: true } : null
  ).filter(Boolean);

  const markers = [
    ...ordersWithCoords.map(order => ({ ...order, lat: order.lat, lng: order.lng })),
    ...deliveryMarkers
  ];

  // Example route: shop to buyer for first order
  let route = null;
  if (ordersWithCoords.length && ordersWithCoords[0].shop && ordersWithCoords[0].shop.location && ordersWithCoords[0].buyerLocation) {
    const [shopLat, shopLng] = ordersWithCoords[0].shop.location.split(',').map(Number);
    const [buyerLat, buyerLng] = ordersWithCoords[0].buyerLocation.split(',').map(Number);
    route = [ [shopLat, shopLng], [buyerLat, buyerLng] ];
  }

  return (
    <div style={containerStyle}>
      <MapContainer center={center} zoom={12} style={{ width: '100%', height: '100%', borderRadius: 8 }}>
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        {markers.map(m => (
          <Marker key={m._id} position={[m.lat, m.lng]}>
            <Popup>
              {m.isDeliveryPerson ? (
                <div><b>Delivery Person</b><br />ID: {m._id}</div>
              ) : (
                <div><b>Order</b><br />ID: {m._id}</div>
              )}
            </Popup>
          </Marker>
        ))}
        {route && <Polyline positions={route} color="#4285F4" />}
      </MapContainer>
    </div>
  );
};

export default DeliveryMap;
