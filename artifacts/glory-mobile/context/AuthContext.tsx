import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { setAuthTokenGetter } from '@workspace/api-client-react';

function decodeJwtPayload(token: string): Record<string, any> | null {
  try {
    const base64 = token.split('.')[1]!.replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(atob(base64));
  } catch { return null; }
}

async function fetchRoleFromApi(token: string): Promise<string | null> {
  try {
    const res = await fetch('/api/auth/me', {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.role ?? null;
  } catch { return null; }
}

interface AuthContextType {
  token: string | null;
  userRole: string | null;
  setToken: (token: string | null) => Promise<void>;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [token, setTokenState] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const resolveRole = async (t: string): Promise<string | null> => {
    const payload = decodeJwtPayload(t);
    if (payload?.role) return payload.role;
    return fetchRoleFromApi(t);
  };

  useEffect(() => {
    const loadToken = async () => {
      try {
        const storedToken = await AsyncStorage.getItem('glory_token');
        setTokenState(storedToken);
        if (storedToken) {
          const role = await resolveRole(storedToken);
          setUserRole(role);
        }
      } catch (e) {
        console.error('Failed to load token', e);
      } finally {
        setIsLoading(false);
      }
    };
    loadToken();
    setAuthTokenGetter(async () => AsyncStorage.getItem('glory_token'));
  }, []);

  const setToken = async (newToken: string | null) => {
    try {
      if (newToken) {
        await AsyncStorage.setItem('glory_token', newToken);
        const role = await resolveRole(newToken);
        setUserRole(role);
      } else {
        await AsyncStorage.removeItem('glory_token');
        setUserRole(null);
      }
      setTokenState(newToken);
    } catch (e) {
      console.error('Failed to save token', e);
    }
  };

  return (
    <AuthContext.Provider value={{ token, userRole, setToken, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
