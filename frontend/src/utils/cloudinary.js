// ImageKit Configuration
const IMAGEKIT_CONFIG = {
  publicKey: import.meta.env.VITE_IMAGEKIT_PUBLIC_KEY,
  urlEndpoint: import.meta.env.VITE_IMAGEKIT_URL_ENDPOINT,
  authEndpoint: '/api/imagekit/auth',
};

export const MAX_PRODUCT_IMAGE_BYTES = 1.5 * 1024 * 1024;
const TARGET_MAX_BYTES = MAX_PRODUCT_IMAGE_BYTES;
const INITIAL_MAX_SIDE = 1920;
const MIN_MAX_SIDE = 720;
const MIN_QUALITY = 0.48;

function computeDrawSize(naturalWidth, naturalHeight, maxSide) {
  let w = naturalWidth;
  let h = naturalHeight;
  if (w <= 0 || h <= 0) return { w: maxSide, h: maxSide };
  if (Math.max(w, h) <= maxSide) return { w, h };
  if (w > h) {
    h = Math.round((h * maxSide) / w);
    w = maxSide;
  } else {
    w = Math.round((w * maxSide) / h);
    h = maxSide;
  }
  return { w: Math.max(1, w), h: Math.max(1, h) };
}

function blobToJpegFile(blob, baseName) {
  return new File([blob], `${baseName}.jpg`, {
    type: 'image/jpeg',
    lastModified: Date.now(),
  });
}

export const compressImageForUpload = (file) => {
  return new Promise((resolve) => {
    if (!file.type.startsWith('image/') || file.type === 'image/svg+xml') {
      resolve(file);
      return;
    }
    const baseName = file.name.replace(/\.[^.]+$/i, '') || 'image';
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const nw = img.naturalWidth || img.width;
      const nh = img.naturalHeight || img.height;
      const encode = (maxSide, quality) =>
        new Promise((res) => {
          const { w, h } = computeDrawSize(nw, nh, maxSide);
          const canvas = document.createElement('canvas');
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext('2d');
          if (!ctx) { res(null); return; }
          ctx.drawImage(img, 0, 0, w, h);
          canvas.toBlob((blob) => res(blob), 'image/jpeg', quality);
        });
      (async () => {
        try {
          let maxSide = INITIAL_MAX_SIDE;
          let quality = 0.85;
          let blob = await encode(maxSide, quality);
          if (!blob) { resolve(file); return; }
          while (blob.size > TARGET_MAX_BYTES && quality > MIN_QUALITY + 0.01) {
            quality = Math.max(MIN_QUALITY, quality - 0.07);
            const next = await encode(maxSide, quality);
            if (!next) break;
            blob = next;
          }
          while (blob.size > TARGET_MAX_BYTES && maxSide > MIN_MAX_SIDE) {
            maxSide = Math.floor(maxSide * 0.82);
            const next = await encode(maxSide, quality);
            if (!next) break;
            blob = next;
          }
          resolve(blobToJpegFile(blob, baseName));
        } catch { resolve(file); }
      })();
    };
    img.onerror = () => { URL.revokeObjectURL(url); resolve(file); };
    img.src = url;
  });
};

// Get auth token from your backend
const getImageKitAuth = async () => {
  const res = await fetch(IMAGEKIT_CONFIG.authEndpoint);
  return await res.json();
};

// Upload image to ImageKit
export const uploadImageToCloudinary = async (file, onProgress) => {
  const fileToUpload = await compressImageForUpload(file);
  const auth = await getImageKitAuth();

  const formData = new FormData();
  formData.append('file', fileToUpload);
  formData.append('fileName', fileToUpload.name);
  formData.append('publicKey', IMAGEKIT_CONFIG.publicKey);
  formData.append('signature', auth.signature);
  formData.append('expire', auth.expire);
  formData.append('token', auth.token);
  formData.append('folder', '/uploads/');

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', 'https://upload.imagekit.io/api/v1/files/upload');
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && onProgress) {
        const progress = Math.round((event.loaded / event.total) * 100);
        onProgress(progress);
      }
    };
    xhr.onload = () => {
      if (xhr.status === 200) {
        const response = JSON.parse(xhr.responseText);
        resolve({
          success: true,
          url: response.url,
          publicId: response.fileId,
        });
      } else {
        reject({ success: false, error: 'Upload failed' });
      }
    };
    xhr.onerror = () => reject({ success: false, error: 'Network error' });
    xhr.send(formData);
  });
};

// Upload video to ImageKit
export const uploadVideoToCloudinary = async (file, onProgress) => {
  const auth = await getImageKitAuth();

  const formData = new FormData();
  formData.append('file', file);
  formData.append('fileName', file.name);
  formData.append('publicKey', IMAGEKIT_CONFIG.publicKey);
  formData.append('signature', auth.signature);
  formData.append('expire', auth.expire);
  formData.append('token', auth.token);
  formData.append('folder', '/videos/');

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', 'https://upload.imagekit.io/api/v1/files/upload');
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && onProgress) {
        const progress = Math.round((event.loaded / event.total) * 100);
        onProgress(progress);
      }
    };
    xhr.onload = () => {
      if (xhr.status === 200) {
        const response = JSON.parse(xhr.responseText);
        resolve({
          success: true,
          url: response.url,
          publicId: response.fileId,
          duration: null,
          format: response.fileType,
        });
      } else {
        reject({ success: false, error: 'Upload failed' });
      }
    };
    xhr.onerror = () => reject({ success: false, error: 'Network error' });
    xhr.send(formData);
  });
};
