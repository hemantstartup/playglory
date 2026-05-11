import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { setAuthTokenGetter } from '@workspace/api-client-react';

function decodeJwtRole(token: string): string | null {
  try {
    const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const decoded = JSON.parse(atob(base64));
    return decoded.role ?? null;
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

  useEffect(() => {
    const loadToken = async () => {
      try {
        const storedToken = await AsyncStorage.getItem('glory_token');
        setTokenState(storedToken);
        setUserRole(storedToken ? decodeJwtRole(storedToken) : null);
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
        setUserRole(decodeJwtRole(newToken));
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
