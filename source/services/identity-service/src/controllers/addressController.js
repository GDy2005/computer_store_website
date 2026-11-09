import {sendSuccess} from '@store/http-response';

import {toAddressRequestDTO} from '../dto/request/AddressRequestDTO.js';
import {toAddressResponseDTO} from '../dto/response/UserResponseDTO.js';

export function createAddressController(addressService) {
  return {
    async list(req, res, next) {
      try {
        const data = await addressService.list(
          req.context.userId
        );

        return sendSuccess(res, {
          message: 'Addresses retrieved successfully',
          data: data.map(toAddressResponseDTO)
        });
      } catch (error) {
        next(error);
      }
    },

    async create(req, res, next) {
      try {
        const data = await addressService.create(
          req.context.userId,
          toAddressRequestDTO(req.body)
        );

        return sendSuccess(res, {
          status: 201,
          message: 'Address created successfully',
          data: toAddressResponseDTO(data)
        });
      } catch (error) {
        next(error);
      }
    },

    async update(req, res, next) {
      try {
        const data = await addressService.update(
          req.context.userId,
          req.params.id,
          toAddressRequestDTO(req.body)
        );

        return sendSuccess(res, {
          message: 'Address updated successfully',
          data: toAddressResponseDTO(data)
        });
      } catch (error) {
        next(error);
      }
    },

    async remove(req, res, next) {
      try {
        const data = await addressService.remove(
          req.context.userId,
          req.params.id
        );

        return sendSuccess(res, {
          message: 'Address deleted successfully',
          data
        });
      } catch (error) {
        next(error);
      }
    },

    async setDefault(req, res, next) {
      try {
        const data = await addressService.setDefault(
          req.context.userId,
          req.params.id
        );

        return sendSuccess(res, {
          message: 'Default address updated successfully',
          data: toAddressResponseDTO(data)
        });
      } catch (error) {
        next(error);
      }
    }
  };
}
