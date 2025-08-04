const axios = require('axios');

async function geocodeAddress(address) {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) throw new Error('Google Maps API key not set in env');
  const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${apiKey}`;
  const res = await axios.get(url);
  if (res.data.status === 'OK' && res.data.results.length > 0) {
    const loc = res.data.results[0].geometry.location;
    return { lat: loc.lat, lng: loc.lng };
  }
  throw new Error('Geocoding failed: ' + (res.data.error_message || res.data.status));
}

module.exports = { geocodeAddress };
