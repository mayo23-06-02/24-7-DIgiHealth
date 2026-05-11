import { v2 as cloudinary } from 'cloudinary';

let isConfigured = false;

export const uploadToCloudinary = (buffer: Buffer, folder: string) => {
  if (!isConfigured) {
    const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || process.env.CLOUDINARY_CLOUD_NAME || 'dmvgc1ktj';
    const apiKey = process.env.NEXT_PUBLIC_CLOUDINARY_API_KEY || process.env.CLOUDINARY_API_KEY || '445174386726859';
    const apiSecret = process.env.CLOUDINARY_API_SECRET || 'hQVkKbA_kvuRlj6MioPdIrZVTIE';

    if (cloudName && apiKey && apiSecret) {
      cloudinary.config({
        cloud_name: cloudName,
        api_key: apiKey,
        api_secret: apiSecret,
        secure: true
      });
      isConfigured = true;
    }
  }

  return new Promise<any>((resolve, reject) => {
    if (!isConfigured) {
      return reject(new Error("Cloudinary is not configured correctly."));
    }
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
