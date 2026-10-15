import {getCategoryModel} from '../models/category.model.js';
import {getProductModel} from '../models/product.model.js';
import {getCommentModel} from '../models/comment.model.js';
import {getRatingModel} from '../models/rating.model.js';
import {
  getInventoryReservationModel
} from '../models/inventory-reservation.model.js';

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