function withSession(query, session) {
  if (session && typeof query?.session === 'function') {
    return query.session(session);
  }

  return query;
}

export function createInventoryRepository({InventoryReservation}) {
  return {
    findByOrderId(orderId, session = null) {
      return withSession(
        InventoryReservation.findOne({orderId}),
        session
      );
    },

    findByReservation({reservationId, orderId}, session = null) {
      return withSession(
        InventoryReservation.findOne({
          reservationId,
          orderId
        }),
        session
      );
    },

    async create(input, session) {
      const [reservation] = await InventoryReservation.create(
        [input],
        {session}
      );
      return reservation;
    },

    save(reservation, session) {
      return reservation.save(session ? {session} : undefined);
    }
  };
}
