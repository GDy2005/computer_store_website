import express from 'express';

import {
  registerIdentityModels
} from './config/database.js';
import {
  cloudinary,
  cloudinaryConfigured
} from './config/cloudinary.js';

import {
  createPasswordTokenService
} from './services/passwordTokenService.js';
import {
  createAvatarStorageService
} from './services/avatarStorageService.js';

import {
  createUserRepository
} from './repositories/userRepository.js';

import {
  createPasswordTokenRepository
} from './repositories/passwordTokenRepository.js';

import {
  createAuthService
} from './services/authService.js';

import {
  createUserService
} from './services/userService.js';

import {
  createAddressService
} from './services/addressService.js';

import {
  createInternalUserService
} from './services/internalUserService.js';

import {
  createAdminUserService
} from './services/adminUserService.js';

import {
  createAuthController
} from './controllers/authController.js';

import {
  createUserController
} from './controllers/userController.js';

import {
  createAddressController
} from './controllers/addressController.js';

import {
  createInternalUserController
} from './controllers/internalUserController.js';

import {
  createAdminUserController
} from './controllers/adminUserController.js';

import {
  createAuthRouter
} from './routes/authRoutes.js';

import {
  createUserRouter
} from './routes/userRoutes.js';

import {
  createAddressRouter
} from './routes/addressRoutes.js';

import {
  createInternalUserRouter
} from './routes/internalUserRoutes.js';

import {
  createAdminUserRouter
} from './routes/adminUserRoutes.js';

export function buildApp({connection, models}) {
  const router = express.Router();

  const {User, PasswordToken} =
    registerIdentityModels(connection);

  const userRepository = createUserRepository({User});
  const passwordTokenRepository =
    createPasswordTokenRepository({PasswordToken});

  const passwordTokenService =
    createPasswordTokenService({
      passwordTokenRepository
    });

  const avatarStorageService = createAvatarStorageService({
    cloudinary,
    configured: cloudinaryConfigured
  });

  const internalUserService =
    createInternalUserService({
      connection,
      userRepository,
      Outbox: models.Outbox,
      passwordTokenService
    });

  const authService = createAuthService({
    connection,
    userRepository,
    Outbox: models.Outbox,
    passwordTokenService
  });

  const userService = createUserService({
    connection,
    userRepository,
    Outbox: models.Outbox,
    passwordTokenService,
    avatarStorageService
  });

  const addressService = createAddressService({
    userRepository
  });

  const adminUserService = createAdminUserService({
    connection,
    userRepository,
    Outbox: models.Outbox
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
    createAdminUserRouter(
      createAdminUserController({
        adminUserService
      })
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
