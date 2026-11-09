function ownerFilter(owner) {
  return owner.userId
    ? {userId: owner.userId}
    : {guestToken: owner.guestToken};
}

export function createCartRepository({Cart}) {
  return {
    findByOwner(owner) {
      return Cart.findOne(ownerFilter(owner));
    },

    create(owner, expiresAt = null) {
      return new Cart({...owner, expiresAt});
    },

    save(cart, session = undefined) {
      return cart.save(session ? {session} : undefined);
    },

    deleteByOwner(owner, session = undefined) {
      return Cart.deleteOne(
        ownerFilter(owner),
        session ? {session} : undefined
      );
    },

    async findGuestAndUser(guestToken, userId) {
      const [guestCart, userCart] = await Promise.all([
        Cart.findOne({guestToken}),
        Cart.findOne({userId})
      ]);
      return {guestCart, userCart};
    },

    upsertUserCart(userId, items, session) {
      return Cart.findOneAndUpdate(
        {userId},
        {
          $set: {
            userId,
            guestToken: null,
            expiresAt: null,
            items
          }
        },
        {upsert: true, new: true, session}
      );
    },

    deleteGuestCart(guestToken, session) {
      return Cart.deleteOne({guestToken}, {session});
    },

    findById(cartId, session = null) {
      const query = Cart.findById(cartId);
      return session && typeof query?.session === 'function'
        ? query.session(session)
        : query;
    }
  };
}
