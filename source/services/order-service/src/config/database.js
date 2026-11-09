import {getCartModel} from '../models/Cart.js';
import {getCouponModel} from '../models/Coupon.js';
import {getOrderModel} from '../models/Order.js';
import {getLoyaltyAccountModel} from '../models/LoyaltyAccount.js';
import {getLoyaltyTransactionModel} from '../models/LoyaltyTransaction.js';

export function registerOrderModels(connection) {
  return {
    Cart: getCartModel(connection),
    Coupon: getCouponModel(connection),
    Order: getOrderModel(connection),
    LoyaltyAccount: getLoyaltyAccountModel(connection),
    LoyaltyTransaction: getLoyaltyTransactionModel(connection)
  };
}
