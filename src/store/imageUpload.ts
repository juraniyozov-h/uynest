/**
 * Image handling: Compression + Base64 (no Firebase Storage needed)
 */

async function compressImage(file: File, maxWidth = 700, quality = 0.5): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (e) => {
      const original = e.target?.result as string;
      if (!original) { reject(new Error('FileReader returned empty result')); return; }
      const img = new Image();
      img.src = original;
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          if (width > maxWidth) { height = Math.round((maxWidth / width) * height); width = maxWidth; }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) { resolve(original); return; }
          ctx.drawImage(img, 0, 0, width, height);
          const compressed = canvas.toDataURL('image/jpeg', quality);
          resolve(compressed || original);
        } catch {
          resolve(original); // canvas failed — use original
        }
      };
      img.onerror = () => resolve(original); // image decode failed — use original
    };
    reader.onerror = reject;
  });
}

export async function uploadImages(files: File[]): Promise<string[]> {
  return Promise.all(files.map(f => compressImage(f)));
}

export async function uploadComplaintImage(file: File): Promise<string> {
  return compressImage(file, 600, 0.5);
}

export async function uploadReviewImage(file: File): Promise<string> {
  return compressImage(file, 400, 0.5);
}
