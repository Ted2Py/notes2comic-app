import sharp from 'sharp';

// Paper size dimensions in pixels (at 96 DPI for web display)
// Landscape orientation
export const PAPER_SIZE_DIMENSIONS = {
  letter: { width: 1056, height: 816 },   // 11x8.5 inches
  a4: { width: 1123, height: 794 },       // 11.69x8.27 inches
  tabloid: { width: 1632, height: 1056 }, // 17x11 inches
  a3: { width: 1587, height: 1123 },      // 16.54x11.69 inches
};

export const SEPARATE_PANEL_DIMENSIONS = { width: 1056, height: 816 };

/**
 * Process an image buffer to exact dimensions using sharp
 * This ensures the output matches the selected paper size exactly
 */
export async function processImageBufferToDimensions(
  imageBuffer: Buffer,
  pageSize: 'letter' | 'a4' | 'tabloid' | 'a3' | 'separate',
  outputFormat: 'strip' | 'separate' | 'fullpage'
): Promise<Buffer> {
  let targetDimensions;

  if (outputFormat === 'separate' || pageSize === 'separate') {
    targetDimensions = SEPARATE_PANEL_DIMENSIONS;
  } else {
    targetDimensions = PAPER_SIZE_DIMENSIONS[pageSize as keyof typeof PAPER_SIZE_DIMENSIONS];
  }

  try {
    // Process the image to exact dimensions
    // - Resize maintaining aspect ratio to cover the target area
    // - Crop to exact dimensions from center
    // - Use high quality settings
    const processedImage = await sharp(imageBuffer)
      .resize({
        width: targetDimensions.width,
        height: targetDimensions.height,
        fit: 'cover',
        position: 'center',
        kernel: sharp.kernel.lanczos3,
      })
      .toFormat('png', {
        quality: 95,
        compressionLevel: 9,
      })
      .toBuffer();

    return processedImage;
  } catch (error) {
    console.error('Image processing error:', error);
    // If sharp fails, return original buffer
    return imageBuffer;
  }
}

/**
 * Fetch and process an image URL to exact dimensions
 */
export async function fetchAndProcessImage(
  imageUrl: string,
  pageSize: 'letter' | 'a4' | 'tabloid' | 'a3' | 'separate',
  outputFormat: 'strip' | 'separate' | 'fullpage'
): Promise<Buffer> {
  // Handle local URLs
  let fullUrl = imageUrl;
  if (imageUrl.startsWith('/uploads/')) {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    fullUrl = `${baseUrl}${imageUrl}`;
  }

  // Fetch the image
  const response = await fetch(fullUrl);
  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  // Process to exact dimensions
  return processImageBufferToDimensions(buffer, pageSize, outputFormat);
}
