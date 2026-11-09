export class ChatResponseDTO {
  static from(result) {
    return {
      answer: result.answer,
      products: result.products || [],
      meta: result.meta || {}
    };
  }
}
