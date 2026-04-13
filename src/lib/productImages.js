export function parseProductImages(imageValue, imagesValue) {
  if (Array.isArray(imagesValue) && imagesValue.length > 0) {
    return imagesValue.filter((value) => typeof value === 'string' && value.trim());
  }

  if (typeof imageValue === 'string') {
    const trimmed = imageValue.trim();
    if (!trimmed) return [];

    if (trimmed.startsWith('[')) {
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) {
          return parsed.filter((value) => typeof value === 'string' && value.trim());
        }
      } catch {
        // Fall back to single-image mode for legacy rows.
      }
    }

    return [trimmed];
  }

  return [];
}

export function getPrimaryProductImage(imageValue, imagesValue) {
  return parseProductImages(imageValue, imagesValue)[0] ?? null;
}
