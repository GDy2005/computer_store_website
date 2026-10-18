import axios from 'axios';

const guestTokenKey = 'computer-store-guest-cart';

export function peekGuestToken() {
  return localStorage.getItem(guestTokenKey);
}

export function getGuestToken() {
  let token = peekGuestToken();

  if (!token) {
    token = crypto.randomUUID();
    localStorage.setItem(guestTokenKey, token);
  }

  return token;
}

function requestConfig(token = getGuestToken()) {
  return {
    headers: {'x-guest-cart-token': token}
  };
}

export function cartErrorMessage(error, fallback) {
  return error?.response?.data?.error?.message || fallback;
}

export async function fetchCart() {
  const response = await axios.get(
    '/api/v1/cart',
    requestConfig()
  );

  return response.data.data;
}

export async function addCartItem(input) {
  const response = await axios.post(
    '/api/v1/cart/items',
    input,
    requestConfig()
  );

  return response.data.data;
}

export async function updateCartItem(variantId, quantity) {
  const response = await axios.patch(
    `/api/v1/cart/items/${encodeURIComponent(variantId)}`,
    {quantity},
    requestConfig()
  );

  return response.data.data;
}

export async function removeCartItem(variantId) {
  const response = await axios.delete(
    `/api/v1/cart/items/${encodeURIComponent(variantId)}`,
    requestConfig()
  );

  return response.data.data;
}

export async function clearCart() {
  const response = await axios.delete(
    '/api/v1/cart',
    requestConfig()
  );

  return response.data.data;
}

export async function mergeGuestCart(token) {
  const response = await axios.post(
    '/api/v1/cart/merge',
    {},
    requestConfig(token)
  );

  localStorage.removeItem(guestTokenKey);
  return response.data.data;
}

export async function validateCoupon(code) {
  const response = await axios.post(
    '/api/v1/coupons/validate',
    {code},
    requestConfig()
  );

  return response.data.data;
}

export async function previewCheckout(couponCode, pointsToRedeem = 0) {
  const response = await axios.post(
    '/api/v1/checkout/preview',
    {couponCode: couponCode || null, pointsToRedeem},
    requestConfig()
  );

  return response.data.data;
}

export async function placeOrder(input) {
  const response = await axios.post(
    '/api/v1/checkout/place-order',
    input,
    requestConfig()
  );

  return response.data.data;
}

export async function fetchOrderStatus(orderNumber) {
  const response = await axios.get(
    `/api/v1/orders/${encodeURIComponent(orderNumber)}/status`,
    requestConfig()
  );

  return response.data.data;
}
