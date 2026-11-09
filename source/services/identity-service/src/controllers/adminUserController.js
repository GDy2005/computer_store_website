import {sendSuccess} from '@store/http-response';

import {
  toAdminUserBanRequestDTO,
  toAdminUserUpdateRequestDTO
} from '../dto/request/UserRequestDTO.js';
import {toAdminUserResponseDTO} from '../dto/response/UserResponseDTO.js';

export function createAdminUserController({
  adminUserService
}) {
  return {
    async list(req, res, next) {
      try {
        const result = await adminUserService.list(
          req.validatedQuery
        );

        return sendSuccess(res, {
          message: 'Users retrieved successfully',
          data: {
            items: result.items.map(toAdminUserResponseDTO),
            meta: result.meta
          }
        });
      } catch (error) {
        next(error);
      }
    },

    async update(req, res, next) {
      try {
        const data = await adminUserService.update({
          userId: req.params.id,
          input: toAdminUserUpdateRequestDTO(req.body),
          correlationId: req.context.requestId
        });

        return sendSuccess(res, {
          message: 'User updated successfully',
          data: toAdminUserResponseDTO(data)
        });
      } catch (error) {
        next(error);
      }
    },

    async setBan(req, res, next) {
      try {
        const data = await adminUserService.setBan({
          userId: req.params.id,
          ...toAdminUserBanRequestDTO(req.body),
          correlationId: req.context.requestId
        });

        return sendSuccess(res, {
          message: data.isBanned
            ? 'User banned successfully'
            : 'User unbanned successfully',
          data: toAdminUserResponseDTO(data)
        });
      } catch (error) {
        next(error);
      }
    }
  };
}
