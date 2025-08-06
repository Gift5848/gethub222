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
  return axios.post('https://salty-shore-60443-1ab4fdf8d6bb.herokuapp.com/api/orders/place-order', orderPayload, {
    headers: { Authorization: `Bearer ${token}` }
  });
};

export const getMyOrders = async (token) => {
  return axios.get('https://salty-shore-60443-1ab4fdf8d6bb.herokuapp.com/api/orders/my', {
    headers: { Authorization: `Bearer ${token}` }
  });
};
