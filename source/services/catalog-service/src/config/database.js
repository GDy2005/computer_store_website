import {getCategoryModel} from '../models/Category.js';
import {getProductModel} from '../models/Product.js';
import {getCommentModel} from '../models/Comment.js';
import {getRatingModel} from '../models/Rating.js';
import {
  getInventoryReservationModel
} from '../models/InventoryReservation.js';

export function registerCatalogModels(connection) {
  return {
    Category: getCategoryModel(connection),
    Product: getProductModel(connection),
    Comment: getCommentModel(connection),
    Rating: getRatingModel(connection),
    InventoryReservation:
      getInventoryReservationModel(connection)
  };
}