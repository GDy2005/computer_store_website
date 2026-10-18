import {getCartModel} from '../models/cart.model.js';
import {getCouponModel} from '../models/coupon.model.js';
import {getOrderModel} from '../models/order.model.js';
import {getLoyaltyAccountModel} from '../models/loyalty-account.model.js';
import {getLoyaltyTransactionModel} from '../models/loyalty-transaction.model.js';

export function registerOrderModels(connection) {
  return {
    Cart: getCartModel(connection),
    Coupon: getCouponModel(connection),
    Order: getOrderModel(connection),
    LoyaltyAccount: getLoyaltyAccountModel(connection),
    LoyaltyTransaction: getLoyaltyTransactionModel(connection)
  };
}
