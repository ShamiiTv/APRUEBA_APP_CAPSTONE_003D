import { createContext, useContext, useState, useEffect } from 'react';
import { apiFetch } from '../api/client';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Restaurar sesión al refrescar la página
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      setLoading(false);
      return;
    }

    apiFetch('/auth/me')
      .then((res) => {
        // res.data contiene el usuario devuelto por getProfile
        setUser(res.data);
      })
      .catch((err) => {
        console.warn('Sesión expirada o token inválido:', err.message);
        localStorage.removeItem('token');
        setUser(null);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  const loginUser = async (email, password) => {
    const res = await apiFetch('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });

    const accessToken = res.data?.tokens?.accessToken;
    if (accessToken) {
      localStorage.setItem('token', accessToken);
    }
    setUser(res.data.user);
    return res.data;
  };

  const registerUser = async (name, email, password) => {
    const res = await apiFetch('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, email, password }),
    });

    const accessToken = res.data?.tokens?.accessToken;
    if (accessToken) {
      localStorage.setItem('token', accessToken);
    }
    setUser(res.data.user);
    return res.data;
  };

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
  };

  const updateUserState = (patch) => {
    setUser((prev) => (prev ? { ...prev, ...patch } : patch));
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        loginUser,
        registerUser,
        logout,
        updateUserState,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider');
  return ctx;
}