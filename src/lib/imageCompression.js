import { useState } from 'react';

// ─── Product photo compression ──────────────────────────────────────────────
// Camera JPEGs run 20–30 MB, which Cloudinary's unsigned upload rejects and
// which nobody wants to push over a phone connection. We re-encode in the
// browser before uploading: cap the long edge, convert to WebP, then step the
// quality down until the file fits the byte budget. Product shots are viewed at
// a few hundred pixels on a card and zoomed at most to full screen, so 2000px
// at WebP q80 looks identical to the original on screen at ~2% of the bytes.

const MAX_EDGE = 2000;
const TARGET_BYTES = 450 * 1024;
const QUALITY_STEPS = [0.82, 0.72, 0.62, 0.52];
const MIN_EDGE = 1200; // Don't shrink past this chasing the budget.

// WebP encoding needs a canvas that can actually produce it (Safari < 14 can't).
let webpSupport;
function canEncodeWebp() {
  if (webpSupport === undefined) {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 1;
    webpSupport = canvas.toDataURL('image/webp').startsWith('data:image/webp');
  }
  return webpSupport;
}

function drawToCanvas(bitmap, scale) {
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return canvas;
}

function encode(canvas, type, quality) {
  return new Promise((resolve) => canvas.toBlob(resolve, type, quality));
}

// Browsers that support it apply the EXIF orientation while decoding, so a
// portrait photo off a phone doesn't come back on its side.
async function decode(file) {
  try {
    return await createImageBitmap(file, { imageOrientation: 'from-image' });
  } catch {
    return createImageBitmap(file);
  }
}

/**
 * Shrink and re-encode an image for upload.
 *
 * Returns a File — the compressed one when it genuinely came out smaller, the
 * original otherwise (small images, GIFs, or a browser that couldn't decode it,
 * so a failure here never blocks an upload).
 */
export async function compressImage(file, { maxEdge = MAX_EDGE, targetBytes = TARGET_BYTES } = {}) {
  if (!file?.type?.startsWith('image/') || file.type === 'image/gif') return file;

  let bitmap;
  try {
    bitmap = await decode(file);
  } catch {
    return file; // Corrupt or unsupported — let Cloudinary have the original.
  }

  // WebP keeps transparency, so it suits both photos and cut-out PNGs. Without
  // it, fall back per source: JPEG for photos, PNG for anything with an alpha
  // channel we'd otherwise flatten (the resize alone still saves most of it).
  const type = canEncodeWebp()
    ? 'image/webp'
    : file.type === 'image/png'
      ? 'image/png'
      : 'image/jpeg';
  const longEdge = Math.max(bitmap.width, bitmap.height);

  // Already small and within bounds: re-encoding would only cost a generation
  // of quality for nothing.
  if (file.size <= targetBytes && longEdge <= maxEdge) {
    bitmap.close?.();
    return file;
  }

  try {
    let best = null;

    // Two passes: full size first, then a 75% redraw if quality alone wasn't
    // enough. Dropping resolution beats crushing quality into artefacts.
    for (const edge of [Math.min(maxEdge, longEdge), Math.min(maxEdge, longEdge) * 0.75]) {
      if (edge < MIN_EDGE && best) break;
      const canvas = drawToCanvas(bitmap, Math.min(1, edge / longEdge));

      for (const quality of QUALITY_STEPS) {
        const blob = await encode(canvas, type, quality);
        if (!blob) return file;
        if (!best || blob.size < best.size) best = blob;
        if (blob.size <= targetBytes) break;
      }

      if (best.size <= targetBytes) break;
    }

    if (!best || best.size >= file.size) return file;
    return new File([best], renameFor(file.name, type), {
      type,
      lastModified: Date.now(),
    });
  } finally {
    bitmap.close?.();
  }
}

function renameFor(name, type) {
  const ext = { 'image/webp': 'webp', 'image/png': 'png' }[type] || 'jpg';
  const base = (name || 'image').replace(/\.[^.]+$/, '') || 'image';
  return `${base}.${ext}`;
}

// ─── The admin's on/off switch ───────────────────────────────────────────────
// Compression is on by default, but a master shot worth keeping at full
// resolution shouldn't have to go through it. Per-viewer, so it lives in this
// browser only; storage can be unavailable (private mode), where it just
// stays on.

const COMPRESS_KEY = 'uploads_compress';

export function useCompressUploads() {
  const [compress, setCompress] = useState(() => {
    try {
      return localStorage.getItem(COMPRESS_KEY) !== 'off';
    } catch {
      return true;
    }
  });
  const choose = (next) => {
    setCompress(next);
    try { localStorage.setItem(COMPRESS_KEY, next ? 'on' : 'off'); } catch { /* not persisted */ }
  };
  return [compress, choose];
}

// Cloudinary's unsigned upload caps the file size (10 MB on the free plan), so
// an untouched camera JPEG is likely to bounce. Worth saying before they try.
export const CLOUDINARY_UNSIGNED_LIMIT = 10 * 1024 * 1024;

// Cloudinary answers an oversized file with a 400 and a message naming the
// limit. Turn that into something that says what to do about it.
export function uploadErrorFor(xhr, file, compressed) {
  if (xhr.status === 400 && /file size too large/i.test(xhr.responseText || '')) {
    return compressed
      ? `Still too large for Cloudinary at ${formatBytes(file.size)}. Try a smaller image.`
      : `Cloudinary rejected the original (${formatBytes(file.size)}). Switch compression back on, or pick a smaller file.`;
  }
  return 'Upload failed. Check your Cloudinary upload preset.';
}

export function formatBytes(bytes) {
  if (bytes >= 1024 * 1024) {
    const mb = bytes / (1024 * 1024);
    return `${mb >= 10 ? Math.round(mb) : mb.toFixed(1)} MB`;
  }
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}
