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
  signup: (username: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  loading: boolean;
  updateUserProfile: (updatedUser: Partial<User>) => void;
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
  const login = async (email: string, password: string, _remember: boolean) => {
    const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Login failed');
    }

    const data = await response.json();

    setToken(data.token);
    setUser(data.user);

    // Always persist session to localStorage (remember me functionality)
    localStorage.setItem('authToken', data.token);
    localStorage.setItem('authUser', JSON.stringify(data.user));

    navigate('/home');
  };

  // 6. signup(): call your signup API, then redirect to /login (or auto-login)
  const signup = async (username: string, email: string, password: string) => {
    const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/auth/signup`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ username, email, password }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Signup failed');
    }

    await response.json();
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
    <AuthContext.Provider value={{ user, token, login, signup, logout, loading, updateUserProfile }}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;
