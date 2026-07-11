import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import axios from 'axios';

const API = 'http://localhost:5000/api';
const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/auth/user`, { withCredentials: true });
      setUser(res.data);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const login = () => {
    window.location.href = `${API}/auth/google`;
  };

  const logout = async () => {
    try {
      await axios.get(`${API}/auth/logout`, { withCredentials: true });
    } catch {
      /* ignore */
    }
    setUser(null);
    window.location.href = '/';
  };

  const chooseRole = async (role) => {
    const res = await axios.post(`${API}/auth/role`, { role }, { withCredentials: true });
    setUser(res.data);
    return res.data;
  };

  const value = {
    user,
    loading,
    isTeacher: user?.role === 'teacher',
    isStudent: user?.role === 'student',
    needsRole: !!user && !user.role,
    refresh,
    login,
    logout,
    chooseRole,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
