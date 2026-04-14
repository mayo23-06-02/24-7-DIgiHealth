import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 'dmvgc1ktj',
  api_key: process.env.CLOUDINARY_API_KEY || 'XNB5RSsafDYWr5m1uBlZUFuWYJc',
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export const uploadToCloudinary = (buffer: Buffer, folder: string) => {
  return new Promise<any>((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      { folder, resource_type: 'auto' },
      (error, result) => {
        if (error) return reject(error);
        resolve(result);
      }
    );
    uploadStream.end(buffer);
  });
};
