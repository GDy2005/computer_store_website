export function regenerateSession(req) {
  return new Promise((resolve, reject) => {
    req.session.regenerate(error => {
      if (error) reject(error);
      else resolve();
    });
  });
}

export function saveSession(req) {
  return new Promise((resolve, reject) => {
    req.session.save(error => {
      if (error) reject(error);
      else resolve();
    });
  });
}

function destroySession(req) {
  return new Promise((resolve, reject) => {
    req.session.destroy(error => {
      if (error) reject(error);
      else resolve();
    });
  });
}

export async function establishSession(req, user) {
  await regenerateSession(req);

  req.session.userId = user.userId;
  req.session.role = user.role;

  await saveSession(req);
}

export function createAuthController(identityClient) {
  return {
    async login(req, res, next) {
      try {
        const input = LoginRequestDTO.from(req.body);
        const user = await identityClient.verifyCredentials({
            ...input,
            requestId: req.requestId
          });

        await establishSession(req, user);

        sendSuccess(res, {
          message: 'Signed in successfully',
          data: SessionResponseDTO.fromUser(user)
        });
      } catch (error) {
        next(error);
      }
    },

    async logout(req, res, next) {
      try {
        await destroySession(req);

        res.clearCookie('connect.sid');

        sendSuccess(res, {
          message: 'Signed out successfully',
          data: {loggedOut: true}
        });
      } catch (error) {
        next(error);
      }
    }
  };
}
import {sendSuccess} from '@store/http-response';
import {LoginRequestDTO} from '../dto/request/LoginRequestDTO.js';
import {SessionResponseDTO} from '../dto/response/SessionResponseDTO.js';

