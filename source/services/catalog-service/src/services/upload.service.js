import {AppError} from '@store/validation';

function uploadBuffer(cloudinary, file) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: 'computer-store/products',
        resource_type: 'image'
      },
      (error, result) => {
        if (error) reject(error);
        else resolve(result);
      }
    );

    stream.end(file.buffer);
  });
}

export function createUploadService({
  cloudinary,
  configured
}) {
  async function uploadImages(files) {
    if (!configured) {
      throw new AppError(
        503,
        'CLOUDINARY_NOT_CONFIGURED',
        'Image upload is not configured'
      );
    }

    if (!Array.isArray(files) || files.length === 0) {
      throw new AppError(
        400,
        'VALIDATION_ERROR',
        'At least one image is required'
      );
    }

    const uploaded = [];

    try {
      for (const file of files) {
        const result = await uploadBuffer(
          cloudinary,
          file
        );

        uploaded.push({
          url: result.secure_url,
          publicId: result.public_id,
          alt: file.originalname
        });
      }

      return uploaded;
    } catch {
      await Promise.allSettled(
        uploaded.map(image =>
          cloudinary.uploader.destroy(image.publicId)
        )
      );

      throw new AppError(
        502,
        'IMAGE_UPLOAD_FAILED',
        'Could not upload images'
      );
    }
  }

  return {uploadImages};
}