import {AppError} from '@store/validation';
import {createOrderRepository} from '../repositories/orderRepository.js';
import {OrderResponseDTO} from '../dto/response/OrderResponseDTO.js';

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function createAdminOrderService({
  Order,
  orderRepository: injectedOrderRepository
}) {
  const orderRepository = injectedOrderRepository ||
    createOrderRepository({Order});

  async function list({
    page,
    limit,
    search,
    status,
    startDate,
    endDate
  }) {
    const filter = {};

    if (status) filter.status = status;

    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = startDate;
      if (endDate) filter.createdAt.$lte = endDate;
    }

    if (search) {
      const expression = new RegExp(
        escapeRegex(search),
        'i'
      );

      filter.$or = [
        {orderNumber: expression},
        {'customer.fullName': expression},
        {'customer.email': expression},
        {'customer.phone': expression}
      ];
    }

    const {items: orders, totalItems} =
      await orderRepository.listAdmin({filter, page, limit});

    return {
      items: orders.map(order => OrderResponseDTO.admin(order)),
      meta: {
        page,
        limit,
        totalItems,
        totalPages: Math.max(
          1,
          Math.ceil(totalItems / limit)
        )
      }
    };
  }

  async function detail(orderId) {
    const order = await orderRepository.findAdminDetail(orderId);

    if (!order) {
      throw new AppError(
        404,
        'NOT_FOUND',
        'Order not found'
      );
    }

    return OrderResponseDTO.admin(order, {detail: true});
  }

  return {list, detail};
}
