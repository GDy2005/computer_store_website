import {getUserModel} from '../models/user.model.js';
import {
  getPasswordTokenModel
} from '../models/password-token.model.js';

export function registerIdentityModels(connection) {
  return {
    User: getUserModel(connection),
    PasswordToken: getPasswordTokenModel(connection)
  };
}