import {AppError} from '@store/validation';

function uploadBuffer(cloudinary, file, userId) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: 'computer-store/avatars',
        public_id: `user-${userId}-${Date.now()}`,
        resource_type: 'image',
        transformation: [
          {width: 512, height: 512, crop: 'fill', gravity: 'auto'},
          {quality: 'auto', fetch_format: 'auto'}
        ]
      },
      (error, result) => {
        if (error) reject(error);
        else resolve(result);
      }
    );

    stream.end(file.buffer);
  });
}

export function createAvatarStorageService({
  cloudinary,
  configured
}) {
  async function upload(file, userId) {
    if (!configured) {
      throw new AppError(
        503,
        'CLOUDINARY_NOT_CONFIGURED',
        'Avatar upload is not configured'
      );
    }

    if (!file?.buffer) {
      throw new AppError(
        400,
        'VALIDATION_ERROR',
        'An avatar image is required'
      );
    }

    try {
      const result = await uploadBuffer(cloudinary, file, userId);
      return {
        url: result.secure_url,
        publicId: result.public_id
      };
    } catch {
      throw new AppError(
        502,
        'AVATAR_UPLOAD_FAILED',
        'Could not upload avatar'
      );
    }
  }

  async function remove(publicId) {
    if (!configured || !publicId) return;
    await cloudinary.uploader.destroy(publicId);
  }

  return {upload, remove};
}
