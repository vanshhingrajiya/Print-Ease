import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Set up axios defaults
  useEffect(() => {
    setupAxios();
  }, []);

  // Check if user is logged in on app start
  useEffect(() => {
    checkAuth();
  }, []);

  const setupAxios = async () => {
    // Detect LAN IP for device testing; fallback to localhost/emulator
    let host = 'localhost';
    try {
      const dbg = Constants.manifest?.debuggerHost || Constants.expoConfig?.hostUri;
      if (dbg && typeof dbg === 'string') {
        host = dbg.split(':')[0];
      }
    } catch {}
    if (Platform.OS === 'android' && host === 'localhost') {
      host = '10.0.2.2'; // Android emulator loopback to host
    }
    axios.defaults.baseURL = `http://${host}:5000`;

    const token = await AsyncStorage.getItem('token');
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    }
  };

  const checkAuth = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        setLoading(false);
        return;
      }

      const response = await axios.get('/api/auth/me');
      setUser(response.data.user);
    } catch (error) {
      await AsyncStorage.removeItem('token');
      delete axios.defaults.headers.common['Authorization'];
    } finally {
      setLoading(false);
    }
  };

  const requestOtp = async (phone) => {
    try {
      const response = await axios.post('/api/auth/request-otp', { phone });
      return { success: true, devOtp: response.data.devOtp };
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to send OTP';
      return { success: false, message };
    }
  };

  const verifyOtp = async (phone, code) => {
    try {
      const response = await axios.post('/api/auth/verify-otp', { phone, code });
      const { token, user } = response.data;
      await AsyncStorage.setItem('token', token);
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      setUser(user);
      return { success: true };
    } catch (error) {
      const message = error.response?.data?.message || 'Invalid code';
      return { success: false, message };
    }
  };

  const register = async (userData) => {
    try {
      const response = await axios.post('/api/auth/register', {
        ...userData,
        role: 'customer'
      });

      const { token, user } = response.data;
      
      await AsyncStorage.setItem('token', token);
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      setUser(user);
      
      return { success: true };
    } catch (error) {
      const message = error.response?.data?.message || 'Registration failed';
      return { success: false, message };
    }
  };

  const logout = async () => {
    await AsyncStorage.removeItem('token');
    delete axios.defaults.headers.common['Authorization'];
    setUser(null);
  };

  const value = {
    user,
    loading,
    requestOtp,
    verifyOtp,
    register,
    logout,
    checkAuth
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
