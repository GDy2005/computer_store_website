import {sendSuccess} from '@store/http-response';

import {
  toActivateRequestDTO,
  toForgotPasswordRequestDTO,
  toGoogleUserRequestDTO,
  toLoginRequestDTO,
  toRegisterRequestDTO,
  toResetPasswordRequestDTO
} from '../dto/request/AuthRequestDTO.js';

export function createAuthController(authService) {
  return {
    async register(req, res, next) {
      try {
        const data = await authService.register({
          input: toRegisterRequestDTO(req.body),
          correlationId: req.context.requestId
        });

        return sendSuccess(res, {
          status: 201,
          message: 'Account registered successfully',
          data
        });
      } catch (error) {
        next(error);
      }
    },

    async activate(req, res, next) {
      try {
        const data = await authService.activate(
          toActivateRequestDTO(req.body)
        );
        return sendSuccess(res, {
          message: 'Account activated successfully',
          data
        });
      } catch (error) {
        next(error);
      }
    },

    async verifyCredentials(req, res, next) {
      try {
        const data =
          await authService.verifyCredentials(
            toLoginRequestDTO(req.body)
          );

        return sendSuccess(res, {
          message: 'Credentials verified successfully',
          data
        });
      } catch (error) {
        next(error);
      }
    },

    async resolveGoogleUser(req, res, next) {
      try {
        const data = await authService.resolveGoogleUser({
          ...toGoogleUserRequestDTO(req.body),
          correlationId: req.context.requestId
        });

        return sendSuccess(res, {
          message: 'Google account resolved successfully',
          data
        });
      } catch (error) {
        next(error);
      }
    },

    async forgotPassword(req, res, next) {
      try {
        const data = await authService.forgotPassword({
          ...toForgotPasswordRequestDTO(req.body),
          correlationId: req.context.requestId
        });

        return sendSuccess(res, {
          status: 202,
          message: 'Password reset request accepted',
          data
        });
      } catch (error) {
        next(error);
      }
    },

    async resetPassword(req, res, next) {
      try {
        const data =
          await authService.resetPassword(
            toResetPasswordRequestDTO(req.body)
          );

        return sendSuccess(res, {
          message: 'Password reset successfully',
          data
        });
      } catch (error) {
        next(error);
      }
    }
  };
}
