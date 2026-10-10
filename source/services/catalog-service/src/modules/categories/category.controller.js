import {AppError} from '@store/validation';
import {listCategories} from './category.service.js';

export function parseFeatured(value) {
  if (value === undefined) return undefined;
  if (!['true','false'].includes(value)) throw new AppError(400, 'VALIDATION_ERROR', 'featured must be true or false');
  return value === 'true';
}

export function createCategoryController({Category}) {
  return {
    async list(req, res, next) {
      try {
        if (Object.keys(req.query).some(key => key !== 'featured')) {
          throw new AppError(400, 'VALIDATION_ERROR', 'Unexpected category query parameter');
        }
        const items = await listCategories(Category, {featured:parseFeatured(req.query.featured)});
        res.json({success:true,data:{items}});
      } catch (error) {
        next(error);
      }
    }
  };
}
