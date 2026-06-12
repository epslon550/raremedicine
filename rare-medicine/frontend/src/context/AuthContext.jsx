import React, { createContext, useState, useEffect, useContext } from 'react';
import api from '../utils/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Retrieve user & token on load
  useEffect(() => {
    try {
      const storedUser = localStorage.getItem('user');
      const storedToken = localStorage.getItem('token');
      
      if (storedUser && storedToken) {
        setUser(JSON.parse(storedUser));
      }
    } catch (error) {
      console.error('Error loading stored authentication details:', error);
      localStorage.removeItem('user');
      localStorage.removeItem('token');
    }
    setLoading(false);
  }, []);

  // Login handler
  const login = async (email, password) => {
    setLoading(true);
    try {
      const response = await api.post('/auth/login', { email, password });
      const { token, ...userData } = response.data;
      
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(userData));
      setUser(userData);
      return { success: true, user: userData };
    } catch (error) {
      console.error('Login error:', error);
      let message = 'Invalid email or password';
      if (error.response) {
        message = error.response.data?.message || 'Invalid email or password';
      } else if (error.request) {
        const targetUrl = api.defaults.baseURL ? `${api.defaults.baseURL}/auth/login` : '/auth/login';
        message = `Unable to connect to the server. Please check if your backend is running at ${targetUrl} and CORS is allowed.`;
      } else {
        message = error.message;
      }
      return {
        success: false,
        message
      };
    } finally {
      setLoading(false);
    }
  };

  // Register handler (accepts FormData for file uploading)
  const register = async (formData) => {
    setLoading(true);
    try {
      const response = await api.post('/auth/register', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      const { token, ...userData } = response.data;
      
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(userData));
      setUser(userData);
      return { success: true, user: userData };
    } catch (error) {
      console.error('Registration error:', error);
      let message = 'Registration failed';
      if (error.response) {
        message = error.response.data?.message || 'Registration failed';
      } else if (error.request) {
        const targetUrl = api.defaults.baseURL ? `${api.defaults.baseURL}/auth/register` : '/auth/register';
        message = `Unable to connect to the server. Please check if your backend is running at ${targetUrl} and CORS is allowed.`;
      } else {
        message = error.message;
      }
      return {
        success: false,
        message
      };
    } finally {
      setLoading(false);
    }
  };

  // Logout handler
  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  };

  // Refresh profile details (useful after admin approval or changes)
  const refreshProfile = async () => {
    try {
      const response = await api.get('/auth/profile');
      const { user: refreshedUser, pharmacy } = response.data;
      
      const updatedData = {
        ...refreshedUser,
        pharmacy
      };
      localStorage.setItem('user', JSON.stringify(updatedData));
      setUser(updatedData);
    } catch (error) {
      console.error('Refresh profile error:', error);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
