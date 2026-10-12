import React, { createContext, useContext, useState, useEffect } from 'react';
import { IUser, UserRole } from '@quickcommerce/shared-types';
import { apiClient } from '../api/client';

interface AuthContextType {
  user: IUser | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string, role?: UserRole) => Promise<void>;
  loginDemo: (role: UserRole) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<IUser | null>(null);
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('quickcommerce_token'));
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchMe = async () => {
      if (!token) {
        setIsLoading(false);
        return;
      }
      try {
        const res = await apiClient.get('/auth/me');
        setUser(res.data.data);
      } catch {
        localStorage.removeItem('quickcommerce_token');
        setToken(null);
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };
    fetchMe();
  }, [token]);

  const login = async (email: string, password: string) => {
    const res = await apiClient.post('/auth/login', { email, password });
    const { token: receivedToken, user: receivedUser } = res.data.data;
    localStorage.setItem('quickcommerce_token', receivedToken);
    setToken(receivedToken);
    setUser(receivedUser);
  };

  const register = async (name: string, email: string, password: string, role: UserRole = 'CUSTOMER') => {
    const res = await apiClient.post('/auth/register', { name, email, password, role });
    const { token: receivedToken, user: receivedUser } = res.data.data;
    localStorage.setItem('quickcommerce_token', receivedToken);
    setToken(receivedToken);
    setUser(receivedUser);
  };

  const loginDemo = async (role: UserRole) => {
    if (role === 'ADMIN') {
      await login('admin@quickcommerce.com', 'Admin@123');
    } else if (role === 'DELIVERY_PARTNER') {
      await login('partner@quickcommerce.com', 'Partner@123');
    } else {
      await login('customer@quickcommerce.com', 'Customer@123');
    }
  };

  const logout = () => {
    localStorage.removeItem('quickcommerce_token');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!user,
        isLoading,
        login,
        register,
        loginDemo,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
