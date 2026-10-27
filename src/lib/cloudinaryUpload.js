/**
 * Promise-shaped Cloudinary unsigned upload.
 *
 * The product, promo and category forms each inline this with their own
 * progress state. Invoice lines upload several photos at once, so they need it
 * as something awaitable instead.
 */
import { compressImage, uploadErrorFor } from './imageCompression';

const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

/** Beyond this nothing is worth sending to the browser's canvas to compress. */
export const MAX_UPLOAD_BYTES = 50 * 1024 * 1024;

/**
 * Returns the uploaded image's secure_url, or throws an Error whose message is
 * safe to show in the UI.
 */
export async function uploadImage(file, { folder, compress = true, onProgress } = {}) {
  if (!file?.type?.startsWith('image/')) throw new Error('That file is not an image.');
  if (file.size > MAX_UPLOAD_BYTES)      throw new Error('That image is over 50 MB.');

  let out = file;
  if (compress) {
    try { out = await compressImage(file); }
    catch { throw new Error('Could not read that image. Try a different file.'); }
  }

  const body = new FormData();
  body.append('file', out);
  body.append('upload_preset', UPLOAD_PRESET);
  if (folder) body.append('folder', folder);

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`);
    xhr.upload.addEventListener('progress', (evt) => {
      if (evt.lengthComputable) onProgress?.(Math.round((evt.loaded / evt.total) * 100));
    });
    xhr.onload = () => {
      if (xhr.status !== 200) { reject(new Error(uploadErrorFor(xhr, out, compress))); return; }
      try {
        resolve(JSON.parse(xhr.responseText).secure_url);
      } catch {
        reject(new Error('Cloudinary returned something unexpected.'));
      }
    };
    xhr.onerror = () => reject(new Error('Network error during upload. Please try again.'));
    xhr.send(body);
  });
}
