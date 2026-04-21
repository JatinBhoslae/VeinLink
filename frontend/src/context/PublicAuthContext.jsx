import { createContext, useContext, useEffect, useState, useMemo } from 'react';
import publicApi from '../lib/publicApi';

export const PublicAuthContext = createContext(null);

export const PublicAuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async () => {
    try {
      const res = await publicApi.get('/donor-profile/me');
      if (res.data.success) {
        const userData = res.data.data;
        localStorage.setItem('publicUser', JSON.stringify(userData));
        setUser(userData);
      }
    } catch (err) {
      console.error('Failed to sync bio-telemetry:', err);
    }
  };

  useEffect(() => {
    const storedToken = localStorage.getItem('publicToken');
    const stored = localStorage.getItem('publicUser');
    if (stored) {
      setUser(JSON.parse(stored));
    }
    if (storedToken) {
      setToken(storedToken);
      fetchProfile().finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const signup = async (data) => {
    const res = await publicApi.post('/public-auth/signup', data);
    const { token: newToken, user: newUser } = res.data;
    localStorage.setItem('publicToken', newToken);
    localStorage.setItem('publicUser', JSON.stringify(newUser));
    setUser(newUser);
    setToken(newToken);
    return res.data;
  };

  const login = async (data) => {
    const res = await publicApi.post('/public-auth/login', data);
    const { token: newToken, user: newUser } = res.data;
    localStorage.setItem('publicToken', newToken);
    localStorage.setItem('publicUser', JSON.stringify(newUser));
    setUser(newUser);
    setToken(newToken);
    return res.data;
  };

  const logout = async () => {
    try {
      await publicApi.post('/public-auth/logout');
    } catch (error) {
      console.error('Backend logout failed:', error);
    }

    localStorage.removeItem('publicToken');
    localStorage.removeItem('publicUser');
    setUser(null);
    setToken(null);
    window.location.href = '/user/login';
  };

  const updateUser = (newUser) => {
    localStorage.setItem('publicUser', JSON.stringify(newUser));
    setUser(newUser);
  };

  // Tactical Location Stream Engine
  useEffect(() => {
    let watchId = null;
    let lastUpdate = 0;
    const UPDATE_INTERVAL = 3000; // 3s tactical sync interval

    if (user && user.preferences?.liveTracking && navigator.geolocation) {
      console.log('📡 [SIGNAL ACTIVE] Tactical Location Stream Engaged');

      watchId = navigator.geolocation.watchPosition(
        async (position) => {
          const now = Date.now();
          if (now - lastUpdate > UPDATE_INTERVAL) {
            try {
              const { latitude, longitude } = position.coords;
              await publicApi.patch('/public-auth/location', { latitude, longitude });
              lastUpdate = now;
              console.log('✅ [SYNC SUCCESS] Strategic Coordinates Updated');
            } catch (err) {
              console.error('❌ [SIGNAL LOST] Tactical sync failed:', err.message);
            }
          }
        },
        (err) => console.error('❌ [GPS ERROR] Satellite lock failed:', err.message),
        { enableHighAccuracy: true }
      );
    }

    return () => {
      if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId);
        console.log('🛰️ [SIGNAL STANDBY] Tactical Stream De-escalated');
      }
    };
  }, [user?.preferences?.liveTracking, !!user]);

  const value = useMemo(() => ({ 
    user, 
    token, 
    loading, 
    signup, 
    login, 
    logout, 
    updateUser 
  }), [user, token, loading]);

  return (
    <PublicAuthContext.Provider value={value}>
      {children}
    </PublicAuthContext.Provider>
  );
};

export const usePublicAuth = () => useContext(PublicAuthContext);
