import { useContext, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router-dom';
import Input from '../../components/Input';
import Button from '../../components/Button';
import AuthContext from '../../contexts/AuthContext';
import { useDarkMode } from '../../contexts/DarkModeContext';

type LoginFormValues = {
  email: string;
  password: string;
  remember: boolean;
};

export default function Login() {
  const { login } = useContext(AuthContext);
  const { isDarkMode } = useDarkMode();
  const [apiError, setApiError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>();

  const onSubmit = async (data: LoginFormValues) => {
    setApiError(null);
    try {
      await login(data.email, data.password, data.remember);
    } catch (err) {
      console.error('Login failed', err);
      setApiError(err instanceof Error ? err.message : 'Login failed');
    }
  };

  return (
    <div className={`flex items-center justify-center min-h-screen ${
      isDarkMode ? 'bg-black' : 'bg-gray-50'
    }`}>
      <div className={`w-full max-w-md p-8 rounded-xl shadow-md ${
        isDarkMode 
          ? 'bg-gray-900 border border-gray-800' 
          : 'bg-white'
      }`}>
        <h2 className={`text-2xl font-bold mb-6 text-center ${
          isDarkMode ? 'text-white' : 'text-gray-900'
        }`}>
          Log In to Your Account
        </h2>
        {apiError && (
          <div className="mb-4 p-3 text-sm text-red-500 bg-red-50 border border-red-200 rounded-md dark:bg-red-900/20 dark:border-red-800">
            {apiError}
          </div>
        )}
        <form onSubmit={handleSubmit(onSubmit)}>
          <Input
            label="Email"
            type="email"
            {...register('email', { required: 'Email is required' })}
          />
          {errors.email && (
            <p className="text-sm text-red-500 mb-2">{errors.email.message}</p>
          )}

          <Input
            label="Password"
            type="password"
            {...register('password', { required: 'Password is required' })}
          />
          {errors.password && (
            <p className="text-sm text-red-500 mb-2">{errors.password.message}</p>
          )}

          <div className="flex items-center mb-4">
            <input 
              id="remember" 
              type="checkbox" 
              {...register('remember')} 
              className={`mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded ${
                isDarkMode ? 'bg-gray-800 border-gray-600' : 'bg-white'
              }`}
            />
            <label htmlFor="remember" className={`text-sm ${
              isDarkMode ? 'text-gray-300' : 'text-gray-700'
            }`}>
              Remember me
            </label>
          </div>

          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Logging in…' : 'Log In'}
          </Button>
        </form>

        <div className="mt-4 text-center">
          <Link 
            to="/reset-password" 
            className={`text-sm hover:underline ${
              isDarkMode ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-700'
            }`}
          >
            Forgot password?
          </Link>
        </div>
        <div className="mt-2 text-center">
          <span className={`text-sm ${
            isDarkMode ? 'text-gray-400' : 'text-gray-600'
          }`}>
            Don't have an account?
          </span>{' '}
          <Link 
            to="/signup" 
            className={`text-sm hover:underline ${
              isDarkMode ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-700'
            }`}
          >
            Sign up
          </Link>
        </div>
      </div>
    </div>
  );
}