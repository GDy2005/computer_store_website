import {Passport} from 'passport';
import {Strategy as GoogleStrategy} from 'passport-google-oauth20';
import {Router} from 'express';
import {AppError} from '@store/validation';

import {establishSession} from './auth.controller.js';

export function normalizeGoogleProfile(profile) {
  const email = profile.emails?.[0]?.value?.trim().toLowerCase();
  const verified =
    profile._json?.email_verified === true ||
    profile.emails?.[0]?.verified === true;
  const fullName = profile.displayName?.trim();

  if (!profile.id || !email || !verified || !fullName) {
    throw new AppError(
      401,
      'OAUTH_PROFILE_INVALID',
      'Google did not provide a verified profile'
    );
  }

  return {
    providerUserId: profile.id,
    email,
    fullName
  };
}

export function createGoogleOAuthRouter(identityClient) {
  const router = Router();
  const clientID = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const callbackURL = process.env.GOOGLE_CALLBACK_URL;

  if (!clientID || !clientSecret || !callbackURL) {
    const unavailable = (req, res, next) => next(
      new AppError(
        503,
        'OAUTH_NOT_CONFIGURED',
        'Google login is not configured'
      )
    );

    router.get('/api/v1/auth/google', unavailable);
    router.get('/api/v1/auth/google/callback', unavailable);
    return router;
  }

  const passport = new Passport();
  passport.use(
    new GoogleStrategy(
      {
        clientID,
        clientSecret,
        callbackURL,
        state: true
      },
      (accessToken, refreshToken, profile, done) => {
        try {
          done(null, normalizeGoogleProfile(profile));
        } catch (error) {
          done(error);
        }
      }
    )
  );

  router.use(passport.initialize());
  router.get(
    '/api/v1/auth/google',
    passport.authenticate('google', {
      scope: ['profile', 'email'],
      session: false
    })
  );
  router.get(
    '/api/v1/auth/google/callback',
    (req, res, next) => {
      passport.authenticate(
        'google',
        {session: false},
        async (error, profile) => {
          if (error || !profile) {
            return res.redirect('/login?oauth=failed');
          }

          try {
            const user = await identityClient.resolveGoogleUser({
              ...profile,
              requestId: req.requestId
            });
            await establishSession(req, user);
            return res.redirect('/profile?oauth=success');
          } catch (identityError) {
            return next(identityError);
          }
        }
      )(req, res, next);
    }
  );

  return router;
}
