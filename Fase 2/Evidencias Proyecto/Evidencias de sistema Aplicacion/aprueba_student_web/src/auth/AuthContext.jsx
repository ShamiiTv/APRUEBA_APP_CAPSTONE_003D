import { useState, useEffect, useCallback, useRef } from 'react';
import { apiFetch, clearSession, saveTokens } from '../api/client';

import { AuthContext } from './context';
import { useTheme } from '../context/useTheme';

export function AuthProvider({ children }) {
  const [reward,setReward]=useState(null);
  const dismissReward=useCallback(()=>setReward(null),[]);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(() => Boolean(localStorage.getItem('token')));
  const [sessionError, setSessionError] = useState(null);
  const { applyPreferences,lang } = useTheme();
  const sessionRevision = useRef(0);
  const uid = user?.uid;
  const profileTheme = user?.theme;
  const profileLocale = user?.locale;
  useEffect(() => {
    if (uid) applyPreferences({ theme:profileTheme === 'dark' ? 'dark' : 'light',locale:profileLocale === 'en' ? 'en' : 'es' });
  },[uid,profileTheme,profileLocale,applyPreferences]);

  // Restaurar sesión al refrescar la página
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;
    let active = true;

    apiFetch('/auth/me')
      .then((res) => {
        // res.data contiene el usuario devuelto por getProfile
        if (active) setUser(res.data);
      })
      .catch((err) => {
        console.warn('Sesión expirada o token inválido:', err.message);
        if (!active) return;
        if (err.status === 401) clearSession();
        setSessionError(err.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    const endSession = () => { sessionRevision.current++; setReward(null);setUser(null); setSessionError(null); };
    window.addEventListener('aprueba:session-ended', endSession);
    return () => window.removeEventListener('aprueba:session-ended', endSession);
  }, []);

  const loginUser = async (email, password) => {
    setReward(null);
    const res = await apiFetch('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });

    saveTokens(res.data.tokens);
    sessionRevision.current++;
    setSessionError(null);
    setUser(res.data.user);
    if(res.data.dailyLoginReward)setReward({...res.data.dailyLoginReward,welcome:res.data.rewards?.some(r=>r.type==='welcome')===true});
    return res.data;
  };

  const registerUser = async (name, email, password, consent) => {
    setReward(null);
    const res = await apiFetch('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, email, password, consent, locale:lang }),
    });

    saveTokens(res.data.tokens);
    sessionRevision.current++;
    setSessionError(null);
    setUser(res.data.user);
    if(res.data.dailyLoginReward)setReward({...res.data.dailyLoginReward,welcome:res.data.rewards?.some(r=>r.type==='welcome')===true});
    return res.data;
  };

  const logout = () => {
    sessionRevision.current++;
    clearSession();
    setReward(null);
    setSessionError(null);
    setUser(null);
  };

  const updateUserState = useCallback((patch) => {
    setUser((prev) => (prev && (!patch.uid || patch.uid === prev.uid) ? { ...prev, ...patch } : prev));
  }, []);
  const saveProfile = useCallback(async patch => {
    const revision = sessionRevision.current;
    const res = await apiFetch('/auth/profile',{ method:'PATCH',body:JSON.stringify(patch) });
    if (revision !== sessionRevision.current || !localStorage.getItem('token')) throw new Error('La sesión cambió. Vuelve a iniciar sesión.');
    updateUserState(res.data);
    return res.data;
  },[updateUserState]);

  return (
    <AuthContext.Provider
      value={{
        user, reward, dismissReward,
        loading,
        sessionError,
        loginUser,
        registerUser,
        logout,
        updateUserState,
        saveProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
