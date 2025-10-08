import { createContext, useState, useEffect, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';

// 1. Define the shape of your auth state
interface User {
  id: string;
  username: string;
  email: string;
  displayName?: string;
  bio?: string;
  profilePicture?: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (email: string, password: string, remember: boolean) => Promise<void>;
  signup: (username: string, email: string, password: string, enable2FA?: boolean) => Promise<void>;
  logout: () => void;
  loading: boolean;
  updateUserProfile: (updatedUser: Partial<User>) => void;
  // 2FA support
  requires2FA: boolean;
  pending2FAUserId: string | null;
  completeTwoFactorLogin: (userId: string, code: string) => Promise<void>;
}

// 2. Create the context with default values
const AuthContext = createContext<AuthContextType>({
  user: null,
  token: null,
  login: async () => {},
  signup: async () => {},
  logout: () => {},
  loading: true,
  updateUserProfile: () => {},
  requires2FA: false,
  pending2FAUserId: null,
  completeTwoFactorLogin: async () => {},
});

// 3. Provider component
export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const navigate = useNavigate();

  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [requires2FA, setRequires2FA] = useState(false);
  const [pending2FAUserId, setPending2FAUserId] = useState<string | null>(null);

  // 4. On mount, check localStorage for existing token/user
  useEffect(() => {
    const storedToken = localStorage.getItem('authToken');
    const storedUser = localStorage.getItem('authUser');
    if (storedToken && storedUser) {
      try {
        setToken(storedToken);
        setUser(JSON.parse(storedUser));
      } catch (error) {
        console.error('Failed to parse stored user data:', error);
        localStorage.removeItem('authToken');
        localStorage.removeItem('authUser');
      }
    }
    setLoading(false);
  }, []);

  // 5. login(): call your login API, save token/user
  const login = async (email: string, password: string, remember: boolean) => {
    const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password, requestLongLived: remember }), // Honor remember me for non-2FA users
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Login failed');
    }

    const data = await response.json();

    // Check if 2FA is required
    if (data.requires2FA) {
      setRequires2FA(true);
      setPending2FAUserId(data.userId);
      navigate('/2fa');
      return;
    }

    // Normal login flow (no 2FA)
    setToken(data.token);
    setUser(data.user);

    // Always persist session to localStorage (remember me functionality)
    localStorage.setItem('authToken', data.token);
    localStorage.setItem('authUser', JSON.stringify(data.user));
    
    // Store token type for session management
    if (data.tokenType === 'long-lived') {
      localStorage.setItem('authTokenType', 'long-lived');
    } else if (remember) {
      localStorage.setItem('authTokenType', 'remember-me');
    } else {
      localStorage.setItem('authTokenType', 'standard');
    }

    navigate('/home');
  };

  // 6. signup(): call your signup API, then redirect to /login (or auto-login)
  const signup = async (username: string, email: string, password: string, enable2FA?: boolean) => {
    const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/auth/signup`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ username, email, password, enable2FA }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Signup failed');
    }

    await response.json();
    navigate('/login');
  };

  // Complete 2FA login after password verification
  const completeTwoFactorLogin = async (userId: string, code: string) => {
    const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/auth/2fa/verify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ userId, code, requestLongLived: true }), // Request long-lived token for 2FA users
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || '2FA verification failed');
    }

    const data = await response.json();

    if (!data.success) {
      throw new Error('Invalid 2FA code');
    }

    // Successfully verified 2FA
    setToken(data.token);
    setUser(data.user);
    setRequires2FA(false);
    setPending2FAUserId(null);

    // Always persist session to localStorage
    localStorage.setItem('authToken', data.token);
    localStorage.setItem('authUser', JSON.stringify(data.user));
    
    // Store token type - 2FA users get long-lived tokens
    localStorage.setItem('authTokenType', 'long-lived');

    navigate('/home');
  };

  // 7. logout(): clear state + localStorage & redirect to /login
  const logout = () => {
    setToken(null);
    setUser(null);
    setRequires2FA(false);
    setPending2FAUserId(null);
    localStorage.removeItem('authToken');
    localStorage.removeItem('authUser');
    localStorage.removeItem('authTokenType');
    navigate('/login');
  };

  // 8. updateUserProfile(): update user state and localStorage
  const updateUserProfile = (updatedUser: Partial<User>) => {
    if (user) {
      try {
        const newUser = { ...user, ...updatedUser };
        setUser(newUser);
        localStorage.setItem('authUser', JSON.stringify(newUser));
      } catch (error) {
        console.error('Failed to save updated user profile:', error);
      }
    }
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      token, 
      login, 
      signup, 
      logout, 
      loading, 
      updateUserProfile,
      requires2FA,
      pending2FAUserId,
      completeTwoFactorLogin
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;
