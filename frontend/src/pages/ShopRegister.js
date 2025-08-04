import React, { useState, useEffect } from 'react';

const GOOGLE_MAPS_API_KEY = 'AIzaSyB8pbLVvoAFEkVCXyOiasOYZ36YEmdJwpU';

const ShopRegister = () => {
  const [shopName, setShopName] = useState('');
  const [shopLocation, setShopLocation] = useState('');
  const [shopLatLng, setShopLatLng] = useState(null);
  const [address, setAddress] = useState('');
  const [mapLoaded, setMapLoaded] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!window.google) {
      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}`;
      script.async = true;
      script.onload = () => setMapLoaded(true);
      document.body.appendChild(script);
    } else {
      setMapLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (mapLoaded) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const { latitude, longitude } = pos.coords;
          initMap(latitude, longitude);
        },
        () => {
          initMap(9.03, 38.74);
        }
      );
    }
    // eslint-disable-next-line
  }, [mapLoaded]);

  function initMap(lat, lng) {
    const map = new window.google.maps.Map(document.getElementById('shop-map'), {
      center: { lat, lng },
      zoom: 15,
    });
    const marker = new window.google.maps.Marker({
      position: { lat, lng },
      map,
      draggable: true,
    });
    setShopLatLng({ lat, lng });
    setShopLocation(`${lat},${lng}`);
    getAddressFromLatLng(lat, lng);
    marker.addListener('dragend', function (e) {
      setShopLatLng({ lat: e.latLng.lat(), lng: e.latLng.lng() });
      setShopLocation(`${e.latLng.lat()},${e.latLng.lng()}`);
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
    if (!shopName || !shopLocation) {
      setError('Please enter shop name and select location.');
      return;
    }
    // Here you would send shopName, shopLocation, shopLatLng, and address to your backend
    alert(`Shop Registered!\nName: ${shopName}\nLocation: ${address || shopLocation}`);
  };

  return (
    <div style={{maxWidth: 500, margin: '40px auto', background: '#fff', borderRadius: 8, boxShadow: '0 2px 8px #eee', padding: 24}}>
      <h2>Register Shop</h2>
      <form onSubmit={handleSubmit}>
        <div style={{marginBottom: 16}}>
          <label>Shop Name:</label><br/>
          <input value={shopName} onChange={e => setShopName(e.target.value)} style={{width:'100%', padding:8, borderRadius:4}} placeholder="Enter shop name" />
        </div>
        <div style={{marginBottom: 16}}>
          <label>Shop Location (required):</label><br/>
          <div id="shop-map" style={{width:'100%', height:300, borderRadius:8, marginBottom:8}}></div>
          <input value={address} readOnly style={{width:'100%', padding:8, borderRadius:4, background:'#f8f8f8', marginBottom:8}} placeholder="Select location on map" />
          <input value={shopLocation} readOnly style={{width:'100%', padding:8, borderRadius:4, background:'#f8f8f8'}} placeholder="Coordinates" />
        </div>
        {error && <div style={{color:'red', marginBottom:12}}>{error}</div>}
        <button type="submit" style={{background:'#27ae60', color:'#fff', border:'none', borderRadius:4, padding:'10px 24px', fontSize:16, cursor:'pointer'}}>Register Shop</button>
      </form>
    </div>
  );
};

export default ShopRegister;
