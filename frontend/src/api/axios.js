import axios from 'axios';
import apiCache from '../utils/apiCache';

// Create axios instance with base configuration
const axiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor - Attach JWT token
axiosInstance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor - Handle errors globally
axiosInstance.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    // Handle 401 Unauthorized - Token expired or invalid
    if (error.response?.status === 401) {
      // Clear token and redirect to login
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      
      // Only redirect if not already on login page
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }

    // Handle 429 Rate Limit
    if (error.response?.status === 429) {
      console.warn('Rate limit exceeded for:', error.config?.url);
    }
    
    return Promise.reject(error);
  }
);

// Create API wrapper with caching and deduplication
const api = {
  request: async function(config) {
    // Handle caching and deduplication for GET requests
    if (apiCache.shouldCache(config)) {
      const cacheKey = apiCache.generateKey(config);
      
      // Check cache first
      const cachedData = apiCache.get(cacheKey);
      if (cachedData) {
        return Promise.resolve({
          data: cachedData,
          status: 200,
          statusText: 'OK',
          headers: {},
          config: config,
          cached: true
        });
      }

      // Check if request is already pending (deduplication)
      const pendingRequest = apiCache.getPendingRequest(cacheKey);
      if (pendingRequest) {
        return pendingRequest;
      }

      // Make new request and store as pending
      const requestPromise = axiosInstance.request(config)
        .then(response => {
          // Cache successful response
          if (response.status === 200 && response.data) {
            const cacheTTL = config.cacheTTL || apiCache.defaultTTL;
            apiCache.set(cacheKey, response.data, cacheTTL);
          }
          return response;
        })
        .catch(error => {
          throw error;
        });

      apiCache.setPendingRequest(cacheKey, requestPromise);
      return requestPromise;
    }

    // For non-GET requests, use original behavior
    return axiosInstance.request(config);
  },

  get: function(url, config = {}) {
    // If cache is explicitly disabled, bypass caching
    if (config.cache === false) {
      return axiosInstance.get(url, config);
    }
    return this.request({ ...config, method: 'get', url });
  },

  post: function(url, data, config = {}) {
    return axiosInstance.post(url, data, config);
  },

  put: function(url, data, config = {}) {
    return axiosInstance.put(url, data, config);
  },

  patch: function(url, data, config = {}) {
    return axiosInstance.patch(url, data, config);
  },

  delete: function(url, config = {}) {
    return axiosInstance.delete(url, config);
  },

  // Expose axios instance methods for advanced usage
  create: axiosInstance.create.bind(axiosInstance),
  defaults: axiosInstance.defaults,
  interceptors: axiosInstance.interceptors
};

// Export cache utilities for manual cache control
export const invalidateCache = (pattern) => apiCache.invalidate(pattern);
export const clearCache = () => apiCache.clear();
export const getCacheStats = () => apiCache.getStats();

export default api;




