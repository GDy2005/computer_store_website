import {AppError} from '@store/validation';

const guestLifetime = 30 * 24 * 60 * 60 * 1000;

function ownerFilter(owner) {
  return owner.userId
    ? {userId: owner.userId}
    : {guestToken: owner.guestToken};
}

export function createCartService({
  connection,
  Cart,
  catalogClient
}) {
  async function hydrate(cart, owner, requestId) {
    if (!cart || cart.items.length === 0) {
      return {
        cartId: cart?._id?.toString() || null,
        guestToken: owner.guestToken,
        items: [],
        totalItems: 0,
        subtotal: 0
      };
    }

    const requestedItems = cart.items.map(item => ({
      productId: item.productId.toString(),
      variantId: item.variantId.toString(),
      quantity: item.quantity
    }));

    const quotedItems = await catalogClient.quote(
      requestedItems,
      requestId
    );

    const quantityByVariant = new Map(
      requestedItems.map(item => [
        item.variantId,
        item.quantity
      ])
    );

    const items = quotedItems.map(item => {
      const quantity =
        quantityByVariant.get(item.variantId);

      return {
        ...item,
        quantity,
        lineTotal: item.unitPrice * quantity
      };
    });

    return {
      cartId: cart._id.toString(),
      guestToken: owner.guestToken,
      items,
      totalItems: items.reduce(
        (total, item) => total + item.quantity,
        0
      ),
      subtotal: items.reduce(
        (total, item) => total + item.lineTotal,
        0
      )
    };
  }

  async function get(owner, requestId) {
    const cart = await Cart.findOne(ownerFilter(owner));

    return hydrate(cart, owner, requestId);
  }

  async function add(owner, input, requestId) {
    let cart = await Cart.findOne(ownerFilter(owner));

    if (!cart) {
      cart = new Cart({
        ...owner,
        expiresAt: owner.guestToken
          ? new Date(Date.now() + guestLifetime)
          : null
      });
    }

    const existing = cart.items.find(
      item =>
        item.variantId.toString() === input.variantId
    );

    const desiredQuantity =
      (existing?.quantity || 0) + input.quantity;

    await catalogClient.quote(
      [{
        productId: input.productId,
        variantId: input.variantId,
        quantity: desiredQuantity
      }],
      requestId
    );

    if (existing) {
      existing.quantity = desiredQuantity;
    } else {
      cart.items.push(input);
    }

    if (owner.guestToken) {
      cart.expiresAt =
        new Date(Date.now() + guestLifetime);
    }

    await cart.save();

    return hydrate(cart, owner, requestId);
  }

  async function update(
    owner,
    variantId,
    quantity,
    requestId
  ) {
    const cart = await Cart.findOne(ownerFilter(owner));

    const item = cart?.items.find(
      value =>
        value.variantId.toString() === variantId
    );

    if (!item) {
      throw new AppError(
        404,
        'CART_ITEM_NOT_FOUND',
        'Cart item not found'
      );
    }

    await catalogClient.quote(
      [{
        productId: item.productId.toString(),
        variantId,
        quantity
      }],
      requestId
    );

    item.quantity = quantity;
    await cart.save();

    return hydrate(cart, owner, requestId);
  }

  async function remove(owner, variantId, requestId) {
    const cart = await Cart.findOne(ownerFilter(owner));

    if (cart) {
      cart.items = cart.items.filter(
        item =>
          item.variantId.toString() !== variantId
      );

      await cart.save();
    }

    return hydrate(cart, owner, requestId);
  }

  async function clear(owner, requestId) {
    await Cart.deleteOne(ownerFilter(owner));
    return hydrate(null, owner, requestId);
  }

  async function merge(userId, guestToken, requestId) {
    if (!guestToken) {
      return get(
        {userId, guestToken: null},
        requestId
      );
    }

    const [guestCart, userCart] = await Promise.all([
      Cart.findOne({guestToken}),
      Cart.findOne({userId})
    ]);

    if (!guestCart) {
      return get(
        {userId, guestToken: null},
        requestId
      );
    }

    const combined = new Map();

    for (const item of [
      ...(userCart?.items || []),
      ...guestCart.items
    ]) {
      const key = item.variantId.toString();
      const current = combined.get(key);

      if (current) {
        current.quantity += item.quantity;
      } else {
        combined.set(key, {
          productId: item.productId.toString(),
          variantId: key,
          quantity: item.quantity
        });
      }
    }

    const items = [...combined.values()];

    if (items.length > 0) {
      await catalogClient.quote(items, requestId);
    }

    await connection.transaction(async session => {
      await Cart.findOneAndUpdate(
        {userId},
        {
          $set: {
            userId,
            guestToken: null,
            expiresAt: null,
            items
          }
        },
        {
          upsert: true,
          new: true,
          session
        }
      );

      await Cart.deleteOne(
        {guestToken},
        {session}
      );
    });

    return get(
      {userId, guestToken: null},
      requestId
    );
  }

  return {
    get,
    add,
    update,
    remove,
    clear,
    merge
  };
}
