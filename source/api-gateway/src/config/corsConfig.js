const defaultOrigin = 'http://localhost';

function normalizeConfiguredOrigin(value) {
  const url = new URL(value.trim());

  if (!['http:', 'https:'].includes(url.protocol)) {
    throw new Error(`Unsupported CORS origin protocol: ${url.protocol}`);
  }

  return url.origin;
}

export function getAllowedOrigins(env = process.env) {
  const configured = env.CORS_ALLOWED_ORIGINS ||
    env.FRONTEND_URL ||
    defaultOrigin;
  const origins = configured
    .split(',')
    .map(value => value.trim())
    .filter(Boolean)
    .map(normalizeConfiguredOrigin);

  if (origins.length === 0) {
    throw new Error('CORS_ALLOWED_ORIGINS must contain at least one origin');
  }

  return [...new Set(origins)];
}

export function isOriginAllowed(origin, allowedOrigins) {
  if (!origin) return true;

  try {
    return allowedOrigins.includes(new URL(origin).origin);
  } catch {
    return false;
  }
}

export function createHttpCorsOptions(env = process.env) {
  const allowedOrigins = getAllowedOrigins(env);

  return {
    origin(origin, callback) {
      callback(null, isOriginAllowed(origin, allowedOrigins));
    },
    credentials: true,
    methods: ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Requested-With',
      'X-Request-ID'
    ],
    exposedHeaders: ['X-Request-ID', 'X-Gateway-Instance'],
    maxAge: 600,
    optionsSuccessStatus: 204
  };
}

export function createSocketCorsConfig(env = process.env) {
  const allowedOrigins = getAllowedOrigins(env);

  return {
    cors: {
      origin: allowedOrigins,
      credentials: true,
      methods: ['GET', 'POST']
    },
    allowRequest(request, callback) {
      callback(
        null,
        isOriginAllowed(request.headers.origin, allowedOrigins)
      );
    }
  };
}
