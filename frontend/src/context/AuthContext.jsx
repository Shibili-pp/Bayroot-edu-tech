import { createContext, useContext, useState, useEffect } from 'react';
import { getToken, getUser, setAuth, clearAuth } from '../utils/auth';
import api from '../api/axios';
import { initializeSocket, disconnectSocket } from '../services/socket.service';

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  // Initialize auth state from localStorage
  useEffect(() => {
    const storedToken = getToken();
    const storedUser = getUser();
    
    if (storedToken && storedUser) {
      setToken(storedToken);
      setUser(storedUser);
      // ARCHITECTURE IMPROVEMENT: Initialize Socket.IO connection on app load if user is logged in
      initializeSocket(storedToken);
    }
    
    setLoading(false);

    // Cleanup: Disconnect socket on unmount
    return () => {
      disconnectSocket();
    };
  }, []);

  /**
   * Login function
   * @param {string} email - User email
   * @param {string} password - User password
   * @param {string} role - 'admin' or 'partner'
   */
  const login = async (email, password, role) => {
    try {
      const endpoint = role === 'admin' ? '/admin/login' : '/partner/login';
      const response = await api.post(endpoint, { email, password });

      if (response.data.success && response.data.data.token) {
        const { token: newToken, user: userData } = response.data.data;
        
        // Store in state and localStorage
        setToken(newToken);
        setUser(userData);
        setAuth(newToken, userData);
        
        // ARCHITECTURE IMPROVEMENT: Initialize Socket.IO connection after successful login
        initializeSocket(newToken);
        
        return { success: true, user: userData };
      }
      
      throw new Error(response.data.message || 'Login failed');
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message || 'Login failed';
      return { success: false, error: errorMessage };
    }
  };

  /**
   * Logout function
   */
  const logout = async () => {
    try {
      // Call logout endpoint if token exists
      if (token) {
        const role = user?.role?.toLowerCase();
        const endpoint = role === 'admin' ? '/admin/logout' : '/partner/logout';
        
        try {
          await api.post(endpoint);
        } catch (error) {
          // Continue with logout even if API call fails
          console.error('Logout API error:', error);
        }
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // ARCHITECTURE IMPROVEMENT: Disconnect Socket.IO on logout
      disconnectSocket();
      
      // Clear state and localStorage
      setToken(null);
      setUser(null);
      clearAuth();
    }
  };

  const value = {
    user,
    token,
    login,
    logout,
    isAuthenticated: !!token && !!user,
    loading,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};




