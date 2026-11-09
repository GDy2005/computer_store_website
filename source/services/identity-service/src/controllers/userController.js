import {sendSuccess} from '@store/http-response';

import {
  toChangePasswordRequestDTO,
  toUpdateUserRequestDTO
} from '../dto/request/UserRequestDTO.js';
import {toUserResponseDTO} from '../dto/response/UserResponseDTO.js';

export function createUserController(userService) {
  return {
    async getMe(req, res, next) {
      try {
        const data = await userService.getMe(
          req.context.userId
        );

        return sendSuccess(res, {
          message: 'User profile retrieved successfully',
          data: toUserResponseDTO(data)
        });
      } catch (error) {
        next(error);
      }
    },

    async updateMe(req, res, next) {
      try {
        const data = await userService.updateMe({
          userId: req.context.userId,
          input: toUpdateUserRequestDTO(req.body),
          correlationId: req.context.requestId
        });

        return sendSuccess(res, {
          message: 'User profile updated successfully',
          data: toUserResponseDTO(data)
        });
      } catch (error) {
        next(error);
      }
    },

    async changePassword(req, res, next) {
      try {
        const data = await userService.changePassword({
          userId: req.context.userId,
          ...toChangePasswordRequestDTO(req.body)
        });

        return sendSuccess(res, {
          message: 'Password changed successfully',
          data
        });
      } catch (error) {
        next(error);
      }
    },

    async updateAvatar(req, res, next) {
      try {
        const data = await userService.updateAvatar({
          userId: req.context.userId,
          file: req.file,
          correlationId: req.context.requestId
        });

        return sendSuccess(res, {
          message: 'Avatar updated successfully',
          data: toUserResponseDTO(data)
        });
      } catch (error) {
        next(error);
      }
    }
  };
}
