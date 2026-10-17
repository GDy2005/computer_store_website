import {getCartModel} from '../models/cart.model.js';
import {getCouponModel} from '../models/coupon.model.js';
import {getOrderModel} from '../models/order.model.js';

export function registerOrderModels(connection) {
  return {
    Cart: getCartModel(connection),
    Coupon: getCouponModel(connection),
    Order: getOrderModel(connection)
  };
}