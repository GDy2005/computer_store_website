import {createContext,useCallback,useContext,useEffect,useMemo,useState} from 'react';
import axios from 'axios';

const AuthContext = createContext(null);

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

  const login = useCallback(async credentials => {
    await axios.post('/api/v1/auth/login', credentials);
    return refresh();
  }, [refresh]);

  const logout = useCallback(async () => {
    await axios.post('/api/v1/auth/logout');
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({user,loading,login,logout,refresh}),
    [user,loading,login,logout,refresh]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used inside AuthProvider');
  return value;
}
