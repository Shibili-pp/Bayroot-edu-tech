import { useState, useEffect, useRef } from 'react';
import api, { invalidateCache } from '../api/axios';

/**
 * Custom hook for API calls with caching and deduplication
 * 
 * @param {string} url - API endpoint URL
 * @param {object} options - Configuration options
 * @param {object} options.params - Query parameters
 * @param {number} options.cacheTTL - Cache TTL in milliseconds (default: 30 seconds)
 * @param {boolean} options.enabled - Whether to fetch immediately (default: true)
 * @param {boolean} options.refetchOnMount - Whether to refetch on mount if cached (default: false)
 * @returns {object} { data, loading, error, refetch, invalidate }
 */
export const useApi = (url, options = {}) => {
  const {
    params = {},
    cacheTTL = 30 * 1000,
    enabled = true,
    refetchOnMount = false
  } = options;

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState(null);
  const abortControllerRef = useRef(null);

  const fetchData = async (signal) => {
    try {
      setLoading(true);
      setError(null);

      const config = {
        params,
        cacheTTL,
        signal
      };

      const response = await api.get(url, config);
      
      if (response.data) {
        setData(response.data);
      }
    } catch (err) {
      // Ignore abort errors
      if (err.name === 'AbortError' || err.code === 'ERR_CANCELED') {
        return;
      }

      // Handle rate limiting
      if (err.response?.status === 429) {
        setError(new Error('Rate limit exceeded. Please try again later.'));
      } else {
        setError(err);
      }
    } finally {
      setLoading(false);
    }
  };

  const refetch = () => {
    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Create new abort controller
    abortControllerRef.current = new AbortController();
    fetchData(abortControllerRef.current.signal);
  };

  const invalidate = () => {
    invalidateCache(url);
    refetch();
  };

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      return;
    }

    // Create abort controller
    abortControllerRef.current = new AbortController();
    
    // Check if we should refetch on mount
    if (refetchOnMount) {
      fetchData(abortControllerRef.current.signal);
    } else {
      // Try to get from cache first, then fetch if needed
      fetchData(abortControllerRef.current.signal);
    }

    return () => {
      // Cleanup: abort request on unmount
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [url, JSON.stringify(params), enabled]);

  return {
    data,
    loading,
    error,
    refetch,
    invalidate
  };
};

/**
 * Custom hook for paginated API calls
 * 
 * @param {string} url - API endpoint URL
 * @param {object} options - Configuration options
 * @param {number} options.page - Initial page number (default: 1)
 * @param {number} options.limit - Items per page (default: 50)
 * @param {number} options.maxItems - Maximum items to fetch (default: 200)
 * @param {number} options.cacheTTL - Cache TTL in milliseconds (default: 30 seconds)
 * @returns {object} { data, loading, error, hasMore, loadMore, refetch }
 */
export const usePaginatedApi = (url, options = {}) => {
  const {
    page: initialPage = 1,
    limit = 50,
    maxItems = 200,
    cacheTTL = 30 * 1000
  } = options;

  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const [currentPage, setCurrentPage] = useState(initialPage);
  const abortControllerRef = useRef(null);

  const fetchPage = async (page, signal) => {
    try {
      setLoading(true);
      setError(null);

      const response = await api.get(url, {
        params: { page, limit },
        cacheTTL,
        signal
      });

      if (response.data?.success) {
        const newItems = response.data.data?.students || response.data.data || [];
        const pagination = response.data.data?.pagination;

        setData(prev => {
          // Avoid duplicates
          const existingIds = new Set(prev.map(item => item._id || item.id));
          const uniqueNewItems = newItems.filter(item => !existingIds.has(item._id || item.id));
          return [...prev, ...uniqueNewItems];
        });

        if (pagination) {
          setHasMore(page < pagination.pages && data.length + newItems.length < maxItems);
        } else {
          setHasMore(newItems.length === limit && data.length + newItems.length < maxItems);
        }

        setCurrentPage(page);
      }
    } catch (err) {
      if (err.name === 'AbortError' || err.code === 'ERR_CANCELED') {
        return;
      }

      if (err.response?.status === 429) {
        setError(new Error('Rate limit exceeded. Please try again later.'));
      } else {
        setError(err);
      }
      setHasMore(false);
    } finally {
      setLoading(false);
    }
  };

  const loadMore = () => {
    if (!loading && hasMore && data.length < maxItems) {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      abortControllerRef.current = new AbortController();
      fetchPage(currentPage + 1, abortControllerRef.current.signal);
    }
  };

  const refetch = () => {
    setData([]);
    setCurrentPage(initialPage);
    setHasMore(true);
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();
    fetchPage(initialPage, abortControllerRef.current.signal);
  };

  useEffect(() => {
    abortControllerRef.current = new AbortController();
    fetchPage(initialPage, abortControllerRef.current.signal);

    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [url]);

  return {
    data,
    loading,
    error,
    hasMore,
    loadMore,
    refetch
  };
};

export default useApi;

