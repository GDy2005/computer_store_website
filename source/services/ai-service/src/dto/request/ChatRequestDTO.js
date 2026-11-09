export class ChatRequestDTO {
  static from(body) {
    return {message: String(body.message || '').trim()};
  }
}
