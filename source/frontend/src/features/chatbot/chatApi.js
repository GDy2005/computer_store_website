import axios from 'axios';

export async function sendChatMessage(message, options = {}) {
  const response = await axios.post(
    '/api/v1/ai/chat',
    {message},
    {signal: options.signal}
  );

  return response.data.data;
}

export function chatErrorMessage(error) {
  if (error?.code === 'ERR_CANCELED') return '';

  return error?.response?.data?.error?.message ||
    'Trợ lý đang bận. Bạn vui lòng thử lại sau.';
}
