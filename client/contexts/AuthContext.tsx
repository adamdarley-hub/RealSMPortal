import React, { createContext, useContext, useState, useEffect } from 'react';

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'client';
  company?: string;
  client_id?: string;
  client_contact?: {
    phone?: string;
    address?: string;
    city?: string;
    state?: string;
    zip?: string;
  };
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
    // Check if user has explicitly logged out - this takes highest priority
    const hasLoggedOut = localStorage.getItem('serveportal_logged_out');
    if (hasLoggedOut) {
      console.log('🚪 User has logged out, skipping auto-login');
      setIsLoading(false);
      return;
    }

    // Check for stored auth on startup
    const storedUser = localStorage.getItem('serveportal_user');
    if (storedUser) {
      console.log('💾 Found stored user, logging in');
      setUser(JSON.parse(storedUser));
      setIsLoading(false);
      return;
    }

    // Auto-login admin user in Builder.io preview environment (only if not logged out)
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
    console.log('🔐 Login attempt:', { email, password });
    setIsLoading(true);

    // Check password - generic password for all users during development
    if (password !== 'password') {
      console.log('❌ Invalid password');
      setIsLoading(false);
      return false;
    }

    // Check if it's the admin user first
    const adminUser = mockUsers.find(u => u.role === 'admin' && u.email === email);
    if (adminUser) {
      console.log('✅ Admin login successful');
      setUser(adminUser);
      localStorage.setItem('serveportal_user', JSON.stringify(adminUser));
      localStorage.removeItem('serveportal_logged_out');
      setIsLoading(false);
      return true;
    }

    // Check if it's a hardcoded mock client
    const mockClient = mockUsers.find(u => u.role === 'client' && u.email === email);
    if (mockClient) {
      console.log('✅ Mock client login successful');
      setUser(mockClient);
      localStorage.setItem('serveportal_user', JSON.stringify(mockClient));
      localStorage.removeItem('serveportal_logged_out');
      setIsLoading(false);
      return true;
    }

    // Check if email exists in the clients database
    try {
      const response = await fetch('/api/clients');
      const data = await response.json();

      if (data.clients) {
        const foundClient = data.clients.find((client: any) =>
          client.email?.toLowerCase() === email.toLowerCase()
        );

        if (foundClient) {
          console.log('✅ Database client login successful:', foundClient);

          // Create user object from client data
          const clientUser: User = {
            id: foundClient.id,
            name: foundClient.name,
            email: foundClient.email,
            role: 'client',
            company: foundClient.company,
            client_id: foundClient.id,
            client_contact: {
              phone: foundClient.phone || '',
              address: foundClient.address?.street || '',
              city: foundClient.address?.city || '',
              state: foundClient.address?.state || '',
              zip: foundClient.address?.zip || ''
            }
          };

          setUser(clientUser);
          localStorage.setItem('serveportal_user', JSON.stringify(clientUser));
          localStorage.removeItem('serveportal_logged_out');
          setIsLoading(false);
          return true;
        }
      }
    } catch (error) {
      console.error('Error checking client database:', error);
    }

    console.log('❌ Login failed - user not found');
    setIsLoading(false);
    return false;
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('serveportal_user');
    localStorage.setItem('serveportal_logged_out', 'true');
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
