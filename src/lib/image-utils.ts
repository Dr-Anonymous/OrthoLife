/**
 * Compresses an image file using HTML5 Canvas to target a specific file size.
 * @param file The original image file
 * @param options Compression options
 * @returns A promise that resolves to the compressed Blob
 */
export async function compressImage(
  file: File,
  options: {
    maxSizeKB?: number;
    maxWidthOrHeight?: number;
    initialQuality?: number;
  } = {}
): Promise<Blob | File> {
  const {
    maxSizeKB = 100,
    maxWidthOrHeight = 1024,
    initialQuality = 0.8
  } = options;

  // If file is already smaller than the limit, return it as is
  if (file.size / 1024 <= maxSizeKB) {
    return file;
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        // 1. Calculate new dimensions while maintaining aspect ratio
        if (width > maxWidthOrHeight || height > maxWidthOrHeight) {
          if (width > height) {
            height = (height / width) * maxWidthOrHeight;
            width = maxWidthOrHeight;
          } else {
            width = (width / height) * maxWidthOrHeight;
            height = maxWidthOrHeight;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        
        if (!ctx) {
          reject(new Error('Failed to get canvas context'));
          return;
        }

        // Fill white background for JPEGs (preserves transparency as white)
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);

        // 2. Recursive compression logic
        const attemptCompression = (quality: number) => {
          canvas.toBlob(
            (blob) => {
              if (!blob) {
                reject(new Error('Failed to create blob'));
                return;
              }

              // If size is good or we've reached minimum quality
              if (blob.size / 1024 <= maxSizeKB || quality <= 0.1) {
                // Convert blob back to file to maintain filename/type context if needed
                const compressedFile = new File([blob], file.name, {
                  type: 'image/jpeg',
                  lastModified: Date.now(),
                });
                resolve(compressedFile);
              } else {
                // Reduce quality and try again
                attemptCompression(quality - 0.1);
              }
            },
            'image/jpeg',
            quality
          );
        };

        attemptCompression(initialQuality);
      };
      img.onerror = () => reject(new Error('Failed to load image'));
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
  });
}

/**
 * Processes a signature/seal image: resizes it, removes the neutral light background,
 * and exports as a transparent PNG.
 */
export async function processTransparentImage(
  file: File,
  options: {
    maxWidthOrHeight?: number;
    threshold?: number;
  } = {}
): Promise<File> {
  const { maxWidthOrHeight = 1024, threshold = 115 } = options;

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        // 1. Calculate new dimensions while maintaining aspect ratio
        if (width > maxWidthOrHeight || height > maxWidthOrHeight) {
          if (width > height) {
            height = (height / width) * maxWidthOrHeight;
            width = maxWidthOrHeight;
          } else {
            width = (width / height) * maxWidthOrHeight;
            height = maxWidthOrHeight;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');

        if (!ctx) {
          reject(new Error('Failed to get canvas context'));
          return;
        }

        // 2. Draw resized image onto canvas
        ctx.drawImage(img, 0, 0, width, height);

        // 3. Extract image data to remove white background
        const imageData = ctx.getImageData(0, 0, width, height);
        const data = imageData.data;

        const fadeRange = 10;

        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          const minChannel = Math.min(r, g, b);

          if (minChannel > threshold) {
            if (minChannel >= threshold + fadeRange) {
              data[i + 3] = 0;
            } else {
              const factor = (minChannel - threshold) / fadeRange;
              data[i + 3] = Math.round(data[i + 3] * (1 - factor));
            }
          }
        }

        ctx.putImageData(imageData, 0, 0);

        // 4. Save as PNG to preserve transparency
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('Failed to create transparent PNG blob'));
              return;
            }
            const baseName = file.name.replace(/\.[^/.]+$/, '');
            const transparentFile = new File([blob], `${baseName}_transparent.png`, {
              type: 'image/png',
              lastModified: Date.now(),
            });
            resolve(transparentFile);
          },
          'image/png'
        );
      };
      img.onerror = () => reject(new Error('Failed to load image'));
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
  });
}
