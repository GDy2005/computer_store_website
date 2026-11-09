import {
  createHash,
  randomBytes
} from 'node:crypto';

import {AppError} from '@store/validation';
import {
  createPasswordTokenRepository
} from '../repositories/passwordTokenRepository.js';

function hashToken(rawToken) {
  return createHash('sha256')
    .update(rawToken)
    .digest('hex');
}

export function createPasswordTokenService({
  passwordTokenRepository: injectedPasswordTokenRepository,
  PasswordToken
}) {
  const passwordTokenRepository =
    injectedPasswordTokenRepository ||
    createPasswordTokenRepository({PasswordToken});
  const ttlMinutes = Number(
    process.env.PASSWORD_TOKEN_TTL_MINUTES || 30
  );

  if (!Number.isFinite(ttlMinutes) || ttlMinutes <= 0) {
    throw new Error(
      'PASSWORD_TOKEN_TTL_MINUTES must be a positive number'
    );
  }

  async function revokeAll({userId, type, session}) {
    await passwordTokenRepository.revokeAll({
      userId,
      type,
      session
    });
  }

  async function issue({userId, type, session}) {
    const rawToken = randomBytes(32).toString('hex');

    await revokeAll({userId, type, session});

    await passwordTokenRepository.create(
      {
        userId,
        type,
        tokenHash: hashToken(rawToken),
        expiresAt: new Date(
          Date.now() + ttlMinutes * 60 * 1000
        )
      },
      {session}
    );

    return rawToken;
  }

  async function consume({rawToken, type, session}) {
    const token = await passwordTokenRepository.consume({
      tokenHash: hashToken(rawToken),
      type,
      session
    });

    if (!token) {
      throw new AppError(
        400,
        'TOKEN_INVALID_OR_EXPIRED',
        'Token is invalid or expired'
      );
    }

    return token;
  }

  return {
    issue,
    consume,
    revokeAll
  };
}
