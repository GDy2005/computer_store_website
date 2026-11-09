export class SessionResponseDTO {
  static fromUser(user) {
    return {
      userId: user.userId,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      avatarUrl: user.avatarUrl || ''
    };
  }
}
