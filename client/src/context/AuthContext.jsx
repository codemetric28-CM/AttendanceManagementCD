import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiFetch } from '../utils/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light');
  const navigate = useNavigate();

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  useEffect(() => {
    const token = localStorage.getItem('jwt_token');
    if (!token) {
      setLoading(false);
      return;
    }
    apiFetch('/api/auth/me')
      .then((res) => setUser(res.user))
      .catch(() => {
        localStorage.removeItem('jwt_token');
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, []);

  const toggleTheme = () => {
    const next = theme === 'light' ? 'dark' : 'light';
    localStorage.setItem('theme', next);
    setTheme(next);
  };

  const login = async (email, password) => {
    const res = await apiFetch('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
    localStorage.setItem('jwt_token', res.token);
    setUser(res.user);
    return res;
  };

  const logout = useCallback(() => {
    localStorage.removeItem('jwt_token');
    fetch('/api/auth/logout', { method: 'POST' }).finally(() => {
      setUser(null);
      navigate('/login', { replace: true });
    });
  }, [navigate]);

  return (
    <AuthContext.Provider value={{ user, setUser, loading, theme, toggleTheme, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
