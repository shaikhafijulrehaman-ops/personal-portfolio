const API_BASE_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  ? 'http://localhost:8000'
  : '';

// Helper to optimize image URLs served by Cloudinary or local assets
window.optimizeImageUrl = function (url, width) {
  if (!url) return url;
  
  if (url.includes('res.cloudinary.com')) {
    const parts = url.split('/image/upload/');
    if (parts.length === 2) {
      let transformation = 'f_auto,q_auto';
      if (width) {
        transformation += `,w_${width}`;
      }
      return `${parts[0]}/image/upload/${transformation}/${parts[1]}`;
    }
  }
  
  // Fallback for local assets to serve compressed WebP versions
  if (typeof url === 'string' && url.startsWith('images/') && (url.endsWith('.png') || url.endsWith('.jpg') || url.endsWith('.jpeg'))) {
    const lastDot = url.lastIndexOf('.');
    return url.substring(0, lastDot) + '.webp';
  }
  
  return url;
};

// Save original fetch reference
const originalFetch = window.fetch;

// Intercept all fetch requests
window.fetch = async function (resource, options) {
  let url = resource;
  if (typeof url === 'string') {
    if (url.startsWith('/api/') || url.startsWith('/uploads/') || url.startsWith('uploads/')) {
      if (url.startsWith('uploads/')) {
        url = '/' + url;
      }
      url = API_BASE_URL + url;
    }
  } else if (url instanceof URL) {
    if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/uploads/') || url.pathname.startsWith('uploads/')) {
      let path = url.pathname;
      if (path.startsWith('uploads/')) {
        path = '/' + path;
      }
      url.href = API_BASE_URL + path + url.search;
    }
  }

  const response = await originalFetch(url, options);

  // Hook response.json() to replace relative upload paths with absolute API paths in data
  const originalJson = response.json;
  response.json = async function () {
    const data = await originalJson.call(response);
    return transformUploadPaths(data);
  };

  return response;
};

// Helper function to recursively rewrite relative upload paths to absolute backend paths
function transformUploadPaths(obj) {
  if (!obj) return obj;
  if (typeof obj === 'string') {
    if (obj.startsWith('/uploads/') || obj.startsWith('uploads/')) {
      const path = obj.startsWith('uploads/') ? '/' + obj : obj;
      return API_BASE_URL + path;
    }
    return obj;
  }
  if (Array.isArray(obj)) {
    return obj.map(item => transformUploadPaths(item));
  }
  if (typeof obj === 'object') {
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        obj[key] = transformUploadPaths(obj[key]);
      }
    }
  }
  return obj;
}
