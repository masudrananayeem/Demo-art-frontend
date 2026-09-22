import { auth } from '@/lib/firebase/config';

export interface UploadResult {
  url: string;
  publicId: string;
  width: number;
  height: number;
  format: string;
  bytes: number;
}

export interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

/**
 * Upload image to Cloudinary via server-side API route
 * This keeps the upload preset secret secure on the server.
 * Includes Firebase Auth token for authentication.
 */
export async function uploadImage(
  file: File,
  onProgress?: (progress: UploadProgress) => void
): Promise<UploadResult> {
  // Get Firebase Auth token
  const currentUser = auth.currentUser;
  if (!currentUser) {
    throw new Error('You must be logged in to upload images');
  }

  let idToken: string;
  try {
    idToken = await currentUser.getIdToken();
  } catch (error) {
    throw new Error('Failed to get authentication token. Please log in again.');
  }

  const formData = new FormData();
  formData.append('file', file);

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    // Track upload progress
    if (onProgress) {
      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          onProgress({
            loaded: e.loaded,
            total: e.total,
            percentage: Math.round((e.loaded / e.total) * 100),
          });
        }
      });
    }

    xhr.addEventListener('load', () => {
      if (xhr.status === 200) {
        try {
          const response = JSON.parse(xhr.responseText);
          if (response.success) {
            resolve({
              url: response.url,
              publicId: response.publicId,
              width: response.width,
              height: response.height,
              format: response.format,
              bytes: response.bytes,
            });
          } else {
            reject(new Error(response.error || 'Upload failed'));
          }
        } catch (error) {
          reject(new Error('Failed to parse upload response'));
        }
      } else {
        try {
          const errorResponse = JSON.parse(xhr.responseText);
          reject(new Error(errorResponse.error || `Upload failed with status ${xhr.status}`));
        } catch {
          reject(new Error(`Upload failed with status ${xhr.status}`));
        }
      }
    });

    xhr.addEventListener('error', () => {
      reject(new Error('Upload failed'));
    });

    xhr.addEventListener('abort', () => {
      reject(new Error('Upload aborted'));
    });

    // Upload to our server-side API route with auth token
    xhr.open('POST', '/api/upload-image');
    xhr.setRequestHeader('Authorization', `Bearer ${idToken}`);
    // Note: CSRF token is skipped for file uploads since FormData makes it difficult
    // Authentication token provides sufficient protection
    xhr.send(formData);
  });
}

/**
 * Upload multiple images
 */
export async function uploadImages(
  files: File[],
  onProgress?: (index: number, progress: UploadProgress) => void
): Promise<UploadResult[]> {
  const uploadPromises = files.map((file, index) => {
    return uploadImage(file, (progress) => {
      onProgress?.(index, progress);
    });
  });

  return Promise.all(uploadPromises);
}
