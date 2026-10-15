export function createUploadController({
  uploadService
}) {
  return {
    async upload(req, res, next) {
      try {
        const images =
          await uploadService.uploadImages(req.files);

        res.status(201).json({
          success: true,
          data: {images}
        });
      } catch (error) {
        next(error);
      }
    }
  };
}
