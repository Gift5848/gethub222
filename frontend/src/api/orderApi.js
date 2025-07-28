import axios from 'axios';

const API_BASE = '/api/orders';

export const addToCart = async (productId, quantity) => {
  const res = await axios.post(`${API_BASE}/cart/add`, { productId, quantity });
  return res.data;
};

export const getCart = async () => {
  const res = await axios.get(`${API_BASE}/cart`);
  return res.data;
};

export const removeFromCart = async (productId) => {
  const res = await axios.post(`${API_BASE}/cart/remove`, { productId });
  return res.data;
};

export const placeOrder = async (config = {}) => {
  const res = await axios.post(`${API_BASE}/place-order`, undefined, config);
  return res.data;
};

export const payOrder = async (orderId) => {
  const res = await axios.post(`${API_BASE}/pay`, { orderId });
  return res.data;
};

export const deliverOrder = async (orderId) => {
  const res = await axios.post(`${API_BASE}/deliver`, { orderId });
  return res.data;
};
