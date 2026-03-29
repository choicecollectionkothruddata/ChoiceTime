// Cloudinary Configuration
export const CLOUDINARY_CONFIG = {
  cloudName: 'daxdjob49',
  uploadPreset: 'rmbgfv9i',
};

// Client-side resize + JPEG encode before every image upload (no extra dependency)
const MAX_WIDTH_OR_HEIGHT = 1920;
const JPEG_QUALITY = 0.82;

const compressImageForUpload = (file) => {
  return new Promise((resolve) => {
    if (!file.type.startsWith('image/') || file.type === 'image/svg+xml') {
      resolve(file);
      return;
    }
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      let { width, height } = img;
      if (width > MAX_WIDTH_OR_HEIGHT || height > MAX_WIDTH_OR_HEIGHT) {
        if (width > height) {
          height = Math.round((height * MAX_WIDTH_OR_HEIGHT) / width);
          width = MAX_WIDTH_OR_HEIGHT;
        } else {
          width = Math.round((width * MAX_WIDTH_OR_HEIGHT) / height);
          height = MAX_WIDTH_OR_HEIGHT;
        }
      }
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob(
        (blob) => {
          if (blob) {
            const base = file.name.replace(/\.[^.]+$/i, '') || 'image';
            const compressed = new File([blob], `${base}.jpg`, {
              type: 'image/jpeg',
              lastModified: Date.now(),
            });
            resolve(compressed);
          } else {
            resolve(file);
          }
        },
        'image/jpeg',
        JPEG_QUALITY
      );
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(file);
    };
    img.src = url;
  });
};

// Upload video to Cloudinary
export const uploadVideoToCloudinary = async (file, onProgress) => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', CLOUDINARY_CONFIG.uploadPreset);
  formData.append('resource_type', 'video');

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    
    xhr.open('POST', `https://api.cloudinary.com/v1_1/${CLOUDINARY_CONFIG.cloudName}/video/upload`);
    
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
          url: response.secure_url,
          publicId: response.public_id,
          duration: response.duration,
          format: response.format,
        });
      } else {
        reject({
          success: false,
          error: 'Upload failed',
        });
      }
    };
    
    xhr.onerror = () => {
      reject({
        success: false,
        error: 'Network error',
      });
    };
    
    xhr.send(formData);
  });
};

// Upload image to Cloudinary (for thumbnails)
export const uploadImageToCloudinary = async (file, onProgress) => {
  const fileToUpload = await compressImageForUpload(file);
  const formData = new FormData();
  formData.append('file', fileToUpload);
  formData.append('upload_preset', CLOUDINARY_CONFIG.uploadPreset);

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    
    xhr.open('POST', `https://api.cloudinary.com/v1_1/${CLOUDINARY_CONFIG.cloudName}/image/upload`);
    
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
          url: response.secure_url,
          publicId: response.public_id,
        });
      } else {
        reject({
          success: false,
          error: 'Upload failed',
        });
      }
    };
    
    xhr.onerror = () => {
      reject({
        success: false,
        error: 'Network error',
      });
    };
    
    xhr.send(formData);
  });
};
