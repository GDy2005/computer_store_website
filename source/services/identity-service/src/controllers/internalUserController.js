import {sendSuccess} from '@store/http-response';

import {toCheckoutUserRequestDTO} from '../dto/request/CheckoutRequestDTO.js';

export function createInternalUserController({
  internalUserService
}) {
  return {
    async getSummary(req, res, next) {
      try {
        const data =
          await internalUserService.getSummary(
            req.params.id
          );

        return sendSuccess(res, {
          message: 'User summary retrieved successfully',
          data
        });
      } catch (error) {
        next(error);
      }
    },

    async resolveCheckout(req, res, next) {
      try {
        const data =
          await internalUserService.resolveCheckout({
            input: toCheckoutUserRequestDTO(req.body),
            correlationId: req.context.requestId
          });

        return sendSuccess(res, {
          message: 'Checkout user resolved successfully',
          data
        });
      } catch (error) {
        next(error);
      }
    }
  };
}
