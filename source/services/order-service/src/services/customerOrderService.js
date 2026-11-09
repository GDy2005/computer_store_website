import {AppError} from '@store/validation';
import {createOrderRepository} from '../repositories/orderRepository.js';
import {OrderResponseDTO} from '../dto/response/OrderResponseDTO.js';

export function createCustomerOrderService({
  Order,
  orderRepository: injectedOrderRepository
}) {
  const orderRepository = injectedOrderRepository ||
    createOrderRepository({Order});

  async function list(userId, {page, limit}) {
    const {items: orders, totalItems} =
      await orderRepository.listForCustomer({
        userId,
        page,
        limit
      });

    return {
      items: orders.map(order => OrderResponseDTO.customer(order)),
      meta: {
        page,
        limit,
        totalItems,
        totalPages: Math.max(1, Math.ceil(totalItems / limit))
      }
    };
  }

  async function detail(userId, orderNumber) {
    const order = await orderRepository.findCustomerDetail(
      userId,
      orderNumber
    );

    if (!order) {
      throw new AppError(404, 'NOT_FOUND', 'Order not found');
    }

    return OrderResponseDTO.customer(order, {detail: true});
  }

  return {list, detail};
}
