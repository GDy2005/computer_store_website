import {Router} from 'express';

import {
  validateActivate,
  validateForgotPassword,
  validateGoogleProfile,
  validateLogin,
  validateRegister,
  validateResetPassword
} from '../validations/auth.validation.js';

export function createAuthRouter(controller) {
  const router = Router();

  router.post(
    '/api/v1/auth/register',
    validateRegister,
    controller.register
  );

  router.post(
    '/api/v1/auth/activate',
    validateActivate,
    controller.activate
  );

  router.post(
    '/api/v1/auth/forgot-password',
    validateForgotPassword,
    controller.forgotPassword
  );

  router.post(
    '/api/v1/auth/reset-password',
    validateResetPassword,
    controller.resetPassword
  );

  router.post(
    '/internal/auth/verify-credentials',
    validateLogin,
    controller.verifyCredentials
  );

  router.post(
    '/internal/auth/google',
    validateGoogleProfile,
    controller.resolveGoogleUser
  );

  return router;
}
