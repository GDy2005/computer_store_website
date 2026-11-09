function withSession(query, session) {
  return session ? query.session(session) : query;
}

function prepareQuery(query, {
  session,
  select,
  lean = false
} = {}) {
  let prepared = withSession(query, session);

  if (select) prepared = prepared.select(select);
  if (lean) prepared = prepared.lean();

  return prepared;
}

export function createUserRepository({User}) {
  function existsByEmail(email, {session} = {}) {
    return withSession(User.exists({email}), session);
  }

  function findByEmail(email, options = {}) {
    return prepareQuery(User.findOne({email}), options);
  }

  function findByGoogleAccount(providerUserId, options = {}) {
    return prepareQuery(
      User.findOne({
        socialAccounts: {
          $elemMatch: {
            provider: 'GOOGLE',
            providerUserId
          }
        }
      }),
      options
    );
  }

  function findAvailableById(userId, options = {}) {
    return prepareQuery(
      User.findOne({
        _id: userId,
        accountStatus: 'ACTIVE',
        isBanned: false
      }),
      options
    );
  }

  function findById(userId, options = {}) {
    return prepareQuery(User.findById(userId), options);
  }

  async function create(data, {session} = {}) {
    const [user] = await User.create(
      [data],
      session ? {session} : undefined
    );

    return user;
  }

  function activatePending(userId, passwordHash, {session} = {}) {
    return User.findOneAndUpdate(
      {
        _id: userId,
        accountStatus: 'PENDING_ACTIVATION'
      },
      {
        $set: {
          passwordHash,
          accountStatus: 'ACTIVE'
        }
      },
      {new: true, session}
    );
  }

  function resetActivePassword(userId, passwordHash, {session} = {}) {
    return User.findOneAndUpdate(
      {
        _id: userId,
        accountStatus: 'ACTIVE',
        isBanned: false
      },
      {$set: {passwordHash}},
      {session}
    );
  }

  function updateActivePassword(userId, passwordHash, {session} = {}) {
    return User.updateOne(
      {
        _id: userId,
        accountStatus: 'ACTIVE',
        isBanned: false
      },
      {$set: {passwordHash}},
      {session}
    );
  }

  function list(filter, {page, limit} = {}) {
    return User.find(filter)
      .sort({createdAt: -1})
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();
  }

  function count(filter) {
    return User.countDocuments(filter);
  }

  function save(user, {session} = {}) {
    return user.save(session ? {session} : undefined);
  }

  return {
    existsByEmail,
    findByEmail,
    findByGoogleAccount,
    findAvailableById,
    findById,
    create,
    activatePending,
    resetActivePassword,
    updateActivePassword,
    list,
    count,
    save
  };
}
