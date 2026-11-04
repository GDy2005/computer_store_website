function sessionCookie(response) {
  return response.headers.get('set-cookie')?.split(';')[0];
}

export async function loginAsAdmin(baseUrl) {
  const response = await fetch(`${baseUrl}/api/v1/auth/login`, {
    method: 'POST',
    headers: {'content-type': 'application/json'},
    body: JSON.stringify({
      email: process.env.ADMIN_EMAIL || 'admin@example.com',
      password: process.env.ADMIN_INITIAL_PASSWORD || 'change-me'
    }),
    signal: AbortSignal.timeout(10000)
  });
  const payload = await response.json();

  if (!response.ok) {
    throw new Error(
      `Admin login failed: ${response.status} ${JSON.stringify(payload)}`
    );
  }

  const cookie = sessionCookie(response);
  if (!cookie) throw new Error('Admin login did not return a session cookie');

  return cookie;
}
