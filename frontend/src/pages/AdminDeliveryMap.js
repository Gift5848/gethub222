import React, { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import DeliveryMap from '../components/DeliveryMap';

const AdminDeliveryMap = () => {
  const [deliveryLocations, setDeliveryLocations] = useState({});
  const socketRef = useRef();

  useEffect(() => {
    socketRef.current = io('/', { path: '/socket.io' });
    socketRef.current.emit('join_admin');
    socketRef.current.on('all_delivery_locations', (locations) => {
      setDeliveryLocations(locations);
    });
    socketRef.current.on('delivery_location_update', (data) => {
      setDeliveryLocations(prev => ({ ...prev, [data.userId]: { lat: data.lat, lng: data.lng, updated: Date.now() } }));
    });
    return () => {
      if (socketRef.current) socketRef.current.disconnect();
    };
  }, []);

  // Convert deliveryLocations to marker array for DeliveryMap
  const markers = Object.entries(deliveryLocations).map(([userId, loc]) => ({
    _id: userId,
    lat: loc.lat,
    lng: loc.lng,
    isDeliveryPerson: true,
    updated: loc.updated
  }));

  return (
    <div>
      <h2>Live Delivery Persons Map</h2>
      <DeliveryMap orders={markers} showDeliveryPopups />
    </div>
  );
};

export default AdminDeliveryMap;
