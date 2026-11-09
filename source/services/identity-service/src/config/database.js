import {getUserModel} from '../models/User.js';
import {
  getPasswordTokenModel
} from '../models/PasswordToken.js';

export function registerIdentityModels(connection) {
  return {
    User: getUserModel(connection),
    PasswordToken: getPasswordTokenModel(connection)
  };
}