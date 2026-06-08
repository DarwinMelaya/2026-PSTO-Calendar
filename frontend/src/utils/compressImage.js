const KB = 1024;

export const formatFileSize = (bytes) => {
  if (!bytes || bytes <= 0) return "0 B";
  if (bytes < KB) return `${bytes} B`;
  if (bytes < KB * KB) return `${(bytes / KB).toFixed(1)} KB`;
  return `${(bytes / (KB * KB)).toFixed(2)} MB`;
};

const loadImage = (file) =>
  new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Could not read image file."));
    };
    img.src = url;
  });

const scaleDimensions = (width, height, maxWidth, maxHeight) => {
  if (width <= maxWidth && height <= maxHeight) {
    return { width, height };
  }
  const ratio = Math.min(maxWidth / width, maxHeight / height);
  return {
    width: Math.max(1, Math.round(width * ratio)),
    height: Math.max(1, Math.round(height * ratio)),
  };
};

const canvasToBlob = (canvas, type, quality) =>
  new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), type, quality);
  });

/**
 * Compress an image file down to KB range using canvas resize + JPEG quality.
 * Returns the original file if it is already small enough.
 */
export async function compressImage(
  file,
  {
    maxWidth = 1600,
    maxHeight = 1600,
    maxSizeBytes = 500 * KB,
    minQuality = 0.35,
    initialQuality = 0.82,
    mimeType = "image/jpeg",
  } = {},
) {
  if (!file?.type?.startsWith("image/")) {
    return file;
  }

  const img = await loadImage(file);
  const { width, height } = scaleDimensions(
    img.width,
    img.height,
    maxWidth,
    maxHeight,
  );

  const alreadySmall =
    file.size <= maxSizeBytes &&
    file.type === mimeType &&
    img.width <= maxWidth &&
    img.height <= maxHeight;

  if (alreadySmall) {
    return file;
  }

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Could not prepare image for compression.");
  }

  ctx.drawImage(img, 0, 0, width, height);

  let quality = initialQuality;
  let blob = await canvasToBlob(canvas, mimeType, quality);

  while (blob && blob.size > maxSizeBytes && quality > minQuality) {
    quality -= 0.07;
    blob = await canvasToBlob(canvas, mimeType, quality);
  }

  if (!blob) {
    throw new Error("Failed to compress image.");
  }

  const baseName = file.name.replace(/\.[^.]+$/u, "") || "photo";
  return new File([blob], `${baseName}.jpg`, {
    type: mimeType,
    lastModified: Date.now(),
  });
}

export const MAX_UPLOAD_INPUT_BYTES = 20 * KB * KB;
