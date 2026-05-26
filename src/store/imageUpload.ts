/**
 * Optimized Image handling: Compression + Base64
 * This avoids Firebase Storage billing and CORS issues.
 */

async function compressImage(file: File, maxWidth = 700, quality = 0.5): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (e) => {
      const img = new Image();
      img.src = e.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > maxWidth) {
          height = (maxWidth / width) * height;
          width = maxWidth;
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.onerror = reject;
    };
    reader.onerror = reject;
  });
}

export async function uploadImages(files: File[]): Promise<string[]> {
  const results: string[] = [];
  for (const file of files) {
    const base64 = await compressImage(file);
    results.push(base64);
  }
  return results;
}

export async function uploadComplaintImage(file: File): Promise<string> {
  return compressImage(file, 600, 0.5); // Complaints can be even smaller
}

export async function uploadReviewImage(file: File): Promise<string> {
  return compressImage(file, 400, 0.5);
}
