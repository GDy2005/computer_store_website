export class LoginRequestDTO {
  static from(body) {
    return {
      email: String(body.email || '').trim().toLowerCase(),
      password: String(body.password || '')
    };
  }
}
