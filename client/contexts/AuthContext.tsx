import React, { createContext, useContext, useState, useEffect } from 'react';

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'client';
  company?: string;
  client_id?: string;
}

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Mock users for demonstration - in production this would come from a backend
const mockUsers: User[] = [
  {
    id: '1',
    name: 'Sarah Johnson',
    email: 'admin@serveportal.com',
    role: 'admin'
  },
  {
    id: '2',
    name: 'Kelly Kerr',
    email: 'kelly@kerrcivilprocess.com',
    role: 'client',
    company: 'Kerr Civil Process',
    client_id: '1454323'
  },
  {
    id: '3',
    name: 'Shawn Wells',
    email: 'office@prontoprocess.com',
    role: 'client',
    company: 'Pronto Process',
    client_id: '1454358'
  }
];

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check for stored auth on startup
    const storedUser = localStorage.getItem('serveportal_user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
      setIsLoading(false);
      return;
    }

    // Auto-login admin user in Builder.io preview environment
    const isBuilderPreview = window.location.search.includes('builder.preview=') ||
                            window.location.hostname.includes('builder.io') ||
                            window.parent !== window;

    if (isBuilderPreview) {
      console.log('🔧 Builder.io preview detected - auto-logging in admin user');
      const adminUser = mockUsers.find(u => u.role === 'admin');
      if (adminUser) {
        setUser(adminUser);
        localStorage.setItem('serveportal_user', JSON.stringify(adminUser));
      }
    }

    setIsLoading(false);
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    setIsLoading(true);
    
    // Mock authentication - in production this would be an API call
    await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API delay
    
    const foundUser = mockUsers.find(u => u.email === email);
    if (foundUser && password === 'password') { // Simple mock password
      setUser(foundUser);
      localStorage.setItem('serveportal_user', JSON.stringify(foundUser));
      setIsLoading(false);
      return true;
    }
    
    setIsLoading(false);
    return false;
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('serveportal_user');
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
