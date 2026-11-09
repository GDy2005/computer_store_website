import {createContext,useCallback,useContext,useEffect,useMemo,useState} from 'react';
import axios from 'axios';

const AuthContext = createContext(null);

export const DEFAULT_AVATAR_URL = 'https://res.cloudinary.com/ipc-media/image/upload/v1794128471/hcibhstn0zhnhzfxyipw.webp';

const SESSION_REFRESH_INTERVAL_MS = 15 * 60 * 1000;

export function getApiMessage(error, fallback) {
  return error.response?.data?.error?.message || fallback;
}

export function AuthProvider({children}) {
  const [user,setUser] = useState(null);
  const [loading,setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const response = await axios.get('/api/v1/users/me');
      setUser(response.data.data);
      return response.data.data;
    } catch (error) {
      if (error.response?.status === 401) {
        setUser(null);
        return null;
      }
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh().catch(() => setLoading(false));
  }, [refresh]);

  useEffect(() => {
    const interceptor = axios.interceptors.response.use(
      response => response,
      error => {
        if (error.response?.status === 401) {
          setUser(null);
        }

        return Promise.reject(error);
      }
    );

    return () => axios.interceptors.response.eject(interceptor);
  }, []);

  useEffect(() => {
    if (!user) return undefined;

    const refreshVisibleSession = () => {
      if (document.visibilityState === 'visible') {
        refresh().catch(() => {});
      }
    };

    const interval = window.setInterval(
      refreshVisibleSession,
      SESSION_REFRESH_INTERVAL_MS
    );

    document.addEventListener(
      'visibilitychange',
      refreshVisibleSession
    );

    return () => {
      window.clearInterval(interval);
      document.removeEventListener(
        'visibilitychange',
        refreshVisibleSession
      );
    };
  }, [user, refresh]);

  const login = useCallback(async credentials => {
    await axios.post('/api/v1/auth/login', credentials);
    return refresh();
  }, [refresh]);

  const logout = useCallback(async () => {
    await axios.post('/api/v1/auth/logout');
    setUser(null);
  }, []);

  const uploadAvatar = useCallback(async file => {
    const body = new FormData();
    body.append('avatar', file);

    const response = await axios.put('/api/v1/users/me/avatar', body);
    setUser(response.data.data);
    return response.data.data;
  }, []);

  const value = useMemo(
    () => ({user,loading,login,logout,refresh,uploadAvatar}),
    [user,loading,login,logout,refresh,uploadAvatar]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used inside AuthProvider');
  return value;
}
