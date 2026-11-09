import {sendSuccess} from '@store/http-response';

export function createUploadController({
  uploadService
}) {
  return {
    async upload(req, res, next) {
      try {
        const images =
          await uploadService.uploadImages(req.files);

        sendSuccess(res, {
          status: 201,
          message: 'Images uploaded successfully',
          data: {images}
        });
      } catch (error) {
        next(error);
      }
    }
  };
}
