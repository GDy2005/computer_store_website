import jwt from 'jsonwebtoken';
export class AppError extends Error {
  constructor(status, code, message, details = []) { super(message); Object.assign(this, {status, code, details}); }
}
export function errorHandler(error, req, res, next) {
  if (res.headersSent) return next(error);
  const status = error.status || 500;
  res.status(status).json({success: false, error: {code: error.code || 'INTERNAL_ERROR', message: status >= 500 ? 'Service temporarily unavailable' : error.message, details: error.details || []}});
}
export function internalAuth(secret) {
  return (req, res, next) => {
    try { req.context = jwt.verify(req.headers['x-internal-token'], secret, {algorithms: ['HS256'], issuer: 'api-gateway', audience: 'core-services'}); next(); }
    catch { next(new AppError(401, 'UNAUTHORIZED', 'Valid internal token required')); }
  };
}
export function signedContext(secret, requestId) {
  return jwt.sign({requestId}, secret, {algorithm: 'HS256', expiresIn: '30s', issuer: 'api-gateway', audience: 'core-services'});
}
