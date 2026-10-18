import axios from 'axios';

export async function fetchLoyalty(page = 1, options = {}) {
  const response = await axios.get('/api/v1/loyalty/me', {
    params: {page, limit: 10},
    signal: options.signal
  });
  return {
    ...response.data.data,
    meta: response.data.meta
  };
}
