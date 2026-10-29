export function createChatController({chatService}) {
  return {
    async create(req, res, next) {
      try {
        const result = await chatService.reply({
          message: req.validatedBody.message,
          requestId: req.context.requestId
        });

        res.json({success: true, data: result});
      } catch (error) {
        next(error);
      }
    }
  };
}
