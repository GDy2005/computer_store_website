import {createEvent} from '@store/event-contracts';

const producer = 'identity-service';

async function enqueue({
  Outbox,
  topic,
  key,
  payload,
  correlationId,
  session
}) {
  const event = createEvent(topic, {
    producer,
    key,
    payload,
    correlationId
  });

  await Outbox.create(
    [
      {
        eventId: event.eventId,
        topic,
        key,
        payload: event
      }
    ],
    {session}
  );

  return event;
}

export function enqueueUserCreated({
  Outbox,
  user,
  correlationId,
  session
}) {
  const userId = user._id.toString();

  return enqueue({
    Outbox,
    topic: 'users.created.v1',
    key: userId,
    correlationId,
    session,
    payload: {
      userId,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      accountStatus: user.accountStatus
    }
  });
}

export function enqueueUserUpdated({
  Outbox,
  user,
  correlationId,
  session
}) {
  const userId = user._id.toString();

  return enqueue({
    Outbox,
    topic: 'users.updated.v1',
    key: userId,
    correlationId,
    session,
    payload: {
      userId,
      fullName: user.fullName,
      isBanned: user.isBanned
    }
  });
}

export function enqueueEmailRequested({
  Outbox,
  user,
  type,
  templateData,
  correlationId,
  session
}) {
  const userId = user._id.toString();

  return enqueue({
    Outbox,
    topic: 'email.requested.v1',
    key: userId,
    correlationId,
    session,
    payload: {
      userId,
      recipientEmail: user.email,
      type,
      templateData
    }
  });
}