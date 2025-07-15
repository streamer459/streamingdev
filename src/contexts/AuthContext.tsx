import React, { createContext, useState, useEffect, ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';

// 1. Define the shape of your auth state
interface User {
  id: string;
  username: string;
  email: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (email: string, password: string, remember: boolean) => Promise<void>;
  signup: (username: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  loading: boolean;
}

// 2. Create the context with default values
const AuthContext = createContext<AuthContextType>({
  user: null,
  token: null,
  login: async () => {},
  signup: async () => {},
  logout: () => {},
  loading: true,
});

// 3. Provider component
export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const navigate = useNavigate();

  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // 4. On mount, check localStorage for existing token/user
  useEffect(() => {
    const storedToken = localStorage.getItem('authToken');
    const storedUser = localStorage.getItem('authUser');
    if (storedToken && storedUser) {
      setToken(storedToken);
      setUser(JSON.parse(storedUser));
    }
    setLoading(false);
  }, []);

  // 5. login(): call your login API, save token/user
  const login = async (email: string, password: string, remember: boolean) => {
    // TODO: Replace the below lines with your real API call:
    // const response = await fetch('/api/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });
    // const data = await response.json(); // expected shape: { token, user: { id, username, email } }

    // === STUBBED RESPONSE (for testing) ===
    await new Promise((r) => setTimeout(r, 500)); // simulate network
    const data = {
      token: 'fake-jwt-token',
      user: { id: '123', username: 'testuser', email },
    };
    // === END STUBBED ===

    setToken(data.token);
    setUser(data.user);

    if (remember) {
      localStorage.setItem('authToken', data.token);
      localStorage.setItem('authUser', JSON.stringify(data.user));
    }

    navigate('/home');
  };

  // 6. signup(): call your signup API, then redirect to /login (or auto-login)
  const signup = async (username: string, email: string, password: string) => {
    // TODO: Replace with your real API call:
    // const response = await fetch('/api/auth/signup', { method: 'POST', body: JSON.stringify({ username, email, password }) });
    // await response.json();

    // === STUBBED RESPONSE (for testing) ===
    await new Promise((r) => setTimeout(r, 500)); // simulate network
    // === END STUBBED ===

    navigate('/login');
  };

  // 7. logout(): clear state + localStorage & redirect to /login
  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('authToken');
    localStorage.removeItem('authUser');
    navigate('/login');
  };

  return (
    <AuthContext.Provider value={{ user, token, login, signup, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;
