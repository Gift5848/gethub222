import axios from 'axios';

// Place an order with all required fields
export const placeOrder = async ({ cart, buyer, seller, paymentMethod, deliveryOption, deliveryLocation, shippingInfo, shippingMethod, shopLocation, shopAddress, token }) => {
  const orderPayload = {
    cart,
    buyer,
    seller,
    paymentMethod,
    deliveryOption,
    deliveryLocation,
    shippingInfo,
    shippingMethod,
    shopLocation,
    shopAddress
  };
  return axios.post('http://localhost:5000/api/orders/place-order', orderPayload, {
    headers: { Authorization: `Bearer ${token}` }
  });
};

export const getMyOrders = async (token) => {
  return axios.get('http://localhost:5000/api/orders/my', {
    headers: { Authorization: `Bearer ${token}` }
  });
};
