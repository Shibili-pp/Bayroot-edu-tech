/**
 * API Request Cache and Deduplication Utility
 * 
 * Features:
 * - Request deduplication (prevents duplicate concurrent requests)
 * - Response caching with TTL
 * - Automatic cache invalidation
 * - Memory-efficient cache management
 */

class ApiCache {
  constructor() {
    // Cache storage: { key: { data, timestamp, ttl } }
    this.cache = new Map();
    
    // Pending requests: { key: Promise }
    this.pendingRequests = new Map();
    
    // Default TTL: 30 seconds
    this.defaultTTL = 30 * 1000;
    
    // Max cache size: 100 entries
    this.maxCacheSize = 100;
    
    // Cleanup interval: every 5 minutes
    this.cleanupInterval = setInterval(() => this.cleanup(), 5 * 60 * 1000);
  }

  /**
   * Generate cache key from request config
   */
  generateKey(config) {
    const { method, url, params, data } = config;
    const paramsStr = params ? JSON.stringify(params) : '';
    const dataStr = data ? JSON.stringify(data) : '';
    return `${method}:${url}:${paramsStr}:${dataStr}`;
  }

  /**
   * Check if request should be cached
   * Only cache GET requests
   */
  shouldCache(config) {
    return config.method?.toLowerCase() === 'get' && config.cache !== false;
  }

  /**
   * Get cached response if available and not expired
   */
  get(key) {
    const cached = this.cache.get(key);
    if (!cached) return null;

    const now = Date.now();
    const isExpired = now - cached.timestamp > cached.ttl;

    if (isExpired) {
      this.cache.delete(key);
      return null;
    }

    return cached.data;
  }

  /**
   * Store response in cache
   */
  set(key, data, ttl = this.defaultTTL) {
    // Remove oldest entries if cache is full
    if (this.cache.size >= this.maxCacheSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }

    this.cache.set(key, {
      data: JSON.parse(JSON.stringify(data)), // Deep clone
      timestamp: Date.now(),
      ttl: ttl
    });
  }

  /**
   * Check if request is already pending
   */
  getPendingRequest(key) {
    return this.pendingRequests.get(key);
  }

  /**
   * Store pending request promise
   */
  setPendingRequest(key, promise) {
    this.pendingRequests.set(key, promise);
    
    // Clean up after request completes (success or error)
    promise
      .then(() => this.pendingRequests.delete(key))
      .catch(() => this.pendingRequests.delete(key));
  }

  /**
   * Invalidate cache for specific URL pattern
   */
  invalidate(pattern) {
    const keysToDelete = [];
    
    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) {
        keysToDelete.push(key);
      }
    }
    
    keysToDelete.forEach(key => this.cache.delete(key));
  }

  /**
   * Clear all cache
   */
  clear() {
    this.cache.clear();
    this.pendingRequests.clear();
  }

  /**
   * Cleanup expired entries
   */
  cleanup() {
    const now = Date.now();
    const keysToDelete = [];

    for (const [key, cached] of this.cache.entries()) {
      if (now - cached.timestamp > cached.ttl) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach(key => this.cache.delete(key));
  }

  /**
   * Get cache statistics
   */
  getStats() {
    return {
      cacheSize: this.cache.size,
      pendingRequests: this.pendingRequests.size,
      maxCacheSize: this.maxCacheSize
    };
  }
}

// Singleton instance
const apiCache = new ApiCache();

export default apiCache;

