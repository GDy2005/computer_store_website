import {sendSuccess} from '@store/http-response';
import {SearchQueryDTO} from '../dto/request/SearchQueryDTO.js';

export function createSearchController({searchService}) {
  return {
    async list(req, res, next) {
      try {
        const result = await searchService.search(
          SearchQueryDTO.from(req.validatedQuery)
        );

        sendSuccess(res, {
          message: 'Search results retrieved successfully',
          data: result
        });
      } catch (error) {
        next(error);
      }
    }
  };
}
