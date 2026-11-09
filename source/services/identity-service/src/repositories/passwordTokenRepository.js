export function createPasswordTokenRepository({PasswordToken}) {
  function revokeAll({userId, type, session}) {
    return PasswordToken.updateMany(
      {
        userId,
        ...(type ? {type} : {}),
        usedAt: null
      },
      {$set: {usedAt: new Date()}},
      {session}
    );
  }

  async function create(data, {session} = {}) {
    const created = await PasswordToken.create(
      [data],
      session ? {session} : undefined
    );

    return Array.isArray(created) ? created[0] : created;
  }

  function consume({tokenHash, type, session}) {
    return PasswordToken.findOneAndUpdate(
      {
        tokenHash,
        type,
        usedAt: null,
        expiresAt: {$gt: new Date()}
      },
      {$set: {usedAt: new Date()}},
      {new: true, session}
    );
  }

  return {revokeAll, create, consume};
}
