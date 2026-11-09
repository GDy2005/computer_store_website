import {sendSuccess} from '@store/http-response';
import {ChatRequestDTO} from '../dto/request/ChatRequestDTO.js';
import {ChatResponseDTO} from '../dto/response/ChatResponseDTO.js';

export function createChatController({chatService}) {
  return {
    async create(req, res, next) {
      try {
        const input = ChatRequestDTO.from(req.validatedBody);
        const result = await chatService.reply({
          message: input.message,
          requestId: req.context.requestId
        });

        sendSuccess(res, {
          message: 'Product advice generated successfully',
          data: ChatResponseDTO.from(result)
        });
      } catch (error) {
        next(error);
      }
    }
  };
}
