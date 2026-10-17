import express from 'express';

import {
  registerIdentityModels
} from './config/database.js';

import {
  createPasswordTokenService
} from './services/password-token.service.js';

import {
  createAuthService
} from './services/auth.service.js';

import {
  createUserService
} from './services/user.service.js';

import {
  createAddressService
} from './services/address.service.js';

import {
  createInternalUserService
} from './services/internal-user.service.js';

import {
  createAuthController
} from './controllers/auth.controller.js';

import {
  createUserController
} from './controllers/user.controller.js';

import {
  createAddressController
} from './controllers/address.controller.js';

import {
  createInternalUserController
} from './controllers/internal-user.controller.js';

import {
  createAuthRouter
} from './routes/auth.routes.js';

import {
  createUserRouter
} from './routes/user.routes.js';

import {
  createAddressRouter
} from './routes/address.routes.js';

import {
  createInternalUserRouter
} from './routes/internal-user.routes.js';

export function buildApp({connection, models}) {
  const router = express.Router();

  const {User, PasswordToken} =
    registerIdentityModels(connection);

  const passwordTokenService =
    createPasswordTokenService({PasswordToken});

  const internalUserService =
    createInternalUserService({
      connection,
      User,
      Outbox: models.Outbox,
      passwordTokenService
    });

  const authService = createAuthService({
    connection,
    User,
    Outbox: models.Outbox,
    passwordTokenService
  });

  const userService = createUserService({
    connection,
    User,
    Outbox: models.Outbox,
    passwordTokenService
  });

  const addressService = createAddressService({
    User
  });

  router.use(
    createAuthRouter(
      createAuthController(authService)
    )
  );

  router.use(
    createUserRouter(
      createUserController(userService)
    )
  );

  router.use(
    createAddressRouter(
      createAddressController(addressService)
    )
  );

  router.use(
    createInternalUserRouter(
      createInternalUserController({
        internalUserService
      })
    )
  );

  return router;
}
