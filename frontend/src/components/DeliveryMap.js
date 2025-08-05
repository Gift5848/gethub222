import React from 'react';
import { GoogleMap, Marker, useJsApiLoader, InfoWindow, Polyline } from '@react-google-maps/api';
import { MarkerClusterer } from '@googlemaps/markerclusterer';

const containerStyle = {
  width: '100%',
  height: '320px',
  borderRadius: 8,
  margin: '24px 0',
};

// Center on a default location (e.g., city center)
const defaultCenter = { lat: 0, lng: 0 };

const DeliveryMap = ({ orders = [], onSelectOrder, deliveryLocations = {}, showDeliveryPopups = false }) => {
  // Use your Google Maps API key here
  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: 'AIzaSyB8pbLVvoAFEkVCXyOiasOYZ36YEmdJwpU', // <-- Replace with your key
  });

  const mapRef = React.useRef();
  const markersRef = React.useRef([]);
  const [selectedOrder, setSelectedOrder] = React.useState(null);
  const [routePath, setRoutePath] = React.useState(null);
  // Show popups for delivery person markers if showDeliveryPopups is true
  const [selectedDelivery, setSelectedDelivery] = React.useState(null);

  // Filter orders with lat/lng
  const ordersWithCoords = orders.filter(o => o.lat && o.lng);
  const center = ordersWithCoords.length ? { lat: ordersWithCoords[0].lat, lng: ordersWithCoords[0].lng } : defaultCenter;

  // Helper: get coordinates from shop location/address (stub for now)
  const getLatLng = (order) => {
    // In production, use geocoding API to convert address to lat/lng
    // Here, just return random coords for demo
    if (order.shop && order.shop.location) {
      // Example: parse 'lat,lng' string or use static mapping
      if (order.shop.location.includes(',')) {
        const [lat, lng] = order.shop.location.split(',').map(Number);
        return { lat, lng };
      }
    }
    // Fallback: random nearby
    return { lat: 9.03 + Math.random()*0.02, lng: 38.74 + Math.random()*0.02 };
  };

  const markers = orders.map(order => ({
    ...order,
    ...getLatLng(order)
  }));

  // Add live delivery person markers
  Object.entries(deliveryLocations).forEach(([userId, loc]) => {
    if (loc && loc.lat && loc.lng) {
      markers.push({
        _id: `delivery_${userId}`,
        lat: loc.lat,
        lng: loc.lng,
        isDeliveryPerson: true
      });
    }
  });

  React.useEffect(() => {
    if (!isLoaded || !mapRef.current) return;
    // Remove previous clusters
    if (markersRef.current.clusterer) {
      markersRef.current.clusterer.clearMarkers();
    }
    // Create markers
    const google = window.google;
    const map = mapRef.current.state.map;
    const markerObjs = orders.map(order => {
      const pos = order.lat && order.lng ? { lat: order.lat, lng: order.lng } : getLatLng(order);
      return new google.maps.Marker({
        position: pos,
        label: order._id.slice(-4),
        map,
        orderId: order._id,
      });
    });
    // Add clustering
    markersRef.current.clusterer = new MarkerClusterer({
      map,
      markers: markerObjs,
    });
    // Add click listeners
    markerObjs.forEach((marker, idx) => {
      marker.addListener('click', () => {
        setSelectedOrder(orders[idx]);
        onSelectOrder(orders[idx]);
        // Draw route from shop to buyer if both locations exist
        const order = orders[idx];
        let shop, buyer;
        if (order.shop && order.shop.location && order.buyerLocation) {
          const [shopLat, shopLng] = order.shop.location.split(',').map(Number);
          const [buyerLat, buyerLng] = order.buyerLocation.split(',').map(Number);
          setRoutePath([
            { lat: shopLat, lng: shopLng },
            { lat: buyerLat, lng: buyerLng }
          ]);
        } else {
          setRoutePath(null);
        }
      });
    });
    // Cleanup
    return () => {
      markerObjs.forEach(marker => marker.setMap(null));
      if (markersRef.current.clusterer) markersRef.current.clusterer.clearMarkers();
    };
  }, [isLoaded, orders]);

  // --- Show real markers for shop, buyer, and delivery person for selected order ---
  // If a single order is selected, show special markers and route
  let shopMarker = null, buyerMarker = null, deliveryMarker = null, route = null;
  if (selectedOrder) {
    // Shop marker
    if (selectedOrder.shop && selectedOrder.shop.location) {
      const [shopLat, shopLng] = selectedOrder.shop.location.split(',').map(Number);
      shopMarker = <Marker position={{ lat: shopLat, lng: shopLng }} icon={{
        url: 'https://maps.google.com/mapfiles/ms/icons/purple-dot.png',
        scaledSize: { width: 40, height: 40 }
      }} onClick={() => setSelectedOrder(selectedOrder)} label="Shop" />;
    }
    // Buyer marker
    if (selectedOrder.buyerLocation) {
      const [buyerLat, buyerLng] = selectedOrder.buyerLocation.split(',').map(Number);
      buyerMarker = <Marker position={{ lat: buyerLat, lng: buyerLng }} icon={{
        url: 'https://maps.google.com/mapfiles/ms/icons/black-dot.png',
        scaledSize: { width: 40, height: 40 }
      }} onClick={() => setSelectedOrder(selectedOrder)} label="Buyer" />;
    }
    // Delivery person marker (if available)
    if (deliveryLocations && selectedOrder.deliveryPerson && deliveryLocations[selectedOrder.deliveryPerson]) {
      const loc = deliveryLocations[selectedOrder.deliveryPerson];
      deliveryMarker = <Marker position={{ lat: loc.lat, lng: loc.lng }} icon={{
        url: 'https://maps.google.com/mapfiles/ms/icons/blue-dot.png',
        scaledSize: { width: 40, height: 40 }
      }} label="Delivery" />;
    }
    // Route polyline
    if (shopMarker && buyerMarker) {
      const [shopLat, shopLng] = selectedOrder.shop.location.split(',').map(Number);
      const [buyerLat, buyerLng] = selectedOrder.buyerLocation.split(',').map(Number);
      route = <Polyline path={[{ lat: shopLat, lng: shopLng }, { lat: buyerLat, lng: buyerLng }]} options={{ strokeColor: '#4285F4', strokeWeight: 4 }} />;
    }
  }

  if (!isLoaded) return <div>Loading map...</div>;

  return (
    <GoogleMap mapContainerStyle={containerStyle} center={center} zoom={12} ref={mapRef}>
      {/* Show special markers and route for selected order */}
      {shopMarker}
      {buyerMarker}
      {deliveryMarker}
      {route}
      {/* Markers handled by clusterer for all orders */}
      {!selectedOrder && markers.filter(m => !m.isDeliveryPerson).map(m => (
        <Marker key={m._id} position={{ lat: m.lat, lng: m.lng }} label={m._id.slice(-4)} onClick={() => setSelectedOrder(m)} />
      ))}
      {/* Live delivery person markers with popups */}
      {showDeliveryPopups && markers.filter(m => m.isDeliveryPerson).map(m => (
        <Marker key={m._id} position={{ lat: m.lat, lng: m.lng }} icon={{
          url: 'https://maps.google.com/mapfiles/ms/icons/blue-dot.png',
          scaledSize: { width: 40, height: 40 }
        }} label="Delivery" onClick={() => setSelectedDelivery(m)} />
      ))}
      {showDeliveryPopups && selectedDelivery && (
        <InfoWindow
          position={{ lat: selectedDelivery.lat, lng: selectedDelivery.lng }}
          onCloseClick={() => setSelectedDelivery(null)}
        >
          <div style={{ minWidth: 180 }}>
            <div><b>Delivery Person ID:</b> {selectedDelivery._id}</div>
            <div><b>Last Updated:</b> {selectedDelivery.updated ? new Date(selectedDelivery.updated).toLocaleTimeString() : 'N/A'}</div>
          </div>
        </InfoWindow>
      )}
      {selectedOrder && (
        <InfoWindow
          position={selectedOrder.buyerLocation && selectedOrder.buyerLocation.includes(',') ? {
            lat: Number(selectedOrder.buyerLocation.split(',')[0]),
            lng: Number(selectedOrder.buyerLocation.split(',')[1])
          } : { lat: 0, lng: 0 }}
          onCloseClick={() => setSelectedOrder(null)}
        >
          <div style={{ minWidth: 180 }}>
            <div><b>Order:</b> {selectedOrder._id}</div>
            <div><b>Status:</b> {selectedOrder.status}</div>
            <div><b>Buyer:</b> {selectedOrder.buyerAddress || 'N/A'}</div>
            <div><b>Shop:</b> {selectedOrder.shop?.name || 'N/A'}</div>
            <div><b>Price:</b> {selectedOrder.estimatedDeliveryPrice ? `$${selectedOrder.estimatedDeliveryPrice.toFixed(2)}` : 'N/A'}</div>
          </div>
        </InfoWindow>
      )}
    </GoogleMap>
  );
};

export default DeliveryMap;
