import { Cloudinary } from '@cloudinary/url-gen';
import { getPublicEnv } from '@/lib/env/public-env';

// Cloudinary cloud name is public (used for image transformations)
// Note: This instance is currently unused but kept for potential future image transformation needs
// If you need to transform Cloudinary images, import this instance:
// import { cloudinary } from '@/lib/cloudinary/config';
export const cloudinary = new Cloudinary({
  cloud: {
    cloudName: getPublicEnv('NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME', ''),
  },
});

// Note: CLOUDINARY_UPLOAD_PRESET and CLOUDINARY_UPLOAD_URL are no longer exported
// as they are now server-only. Use the /api/upload-image endpoint instead.
