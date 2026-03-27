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
