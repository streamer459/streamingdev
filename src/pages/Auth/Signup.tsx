import React, { useContext } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link } from 'react-router-dom';
import * as z from 'zod';
import Input from '../../components/Input';
import Button from '../../components/Button';
import AuthContext from '../../contexts/AuthContext';
import { useDarkMode } from '../../contexts/DarkModeContext';

// Define Zod schema
const SignupSchema = z
  .object({
    username: z
      .string()
      .min(3, 'Username must be at least 3 characters')
      .max(20, 'Username cannot exceed 20 characters'),
    email: z.string().email('Invalid email address'),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(/[A-Z]/, 'Must include at least one uppercase letter')
      .regex(/[a-z]/, 'Must include at least one lowercase letter')
      .regex(/[0-9]/, 'Must include at least one number'),
    confirmPassword: z.string(),
    agreeTOS: z.literal(true, {
      errorMap: () => ({ message: 'You must agree to Terms of Service' }),
    }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Passwords do not match',
  });

type SignupFormValues = z.infer<typeof SignupSchema>;

export default function Signup() {
  const { signup } = useContext(AuthContext);
  const { isDarkMode } = useDarkMode();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignupFormValues>({
    resolver: zodResolver(SignupSchema),
    mode: 'onBlur',
  });

  const onSubmit = async (data: SignupFormValues) => {
    try {
      await signup(data.username, data.email, data.password);
      // AuthContext.signup() already navigates to /login after stubbed success
    } catch (err) {
      console.error('Signup failed', err);
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
          Create an Account
        </h2>
        <form onSubmit={handleSubmit(onSubmit)}>
          <Input
            label="Username"
            type="text"
            placeholder="Your username"
            {...register('username')}
          />
          {errors.username && (
            <p className="text-sm text-red-500 mb-2">{errors.username.message}</p>
          )}

          <Input
            label="Email"
            type="email"
            placeholder="you@example.com"
            {...register('email')}
          />
          {errors.email && (
            <p className="text-sm text-red-500 mb-2">{errors.email.message}</p>
          )}

          <Input
            label="Password"
            type="password"
            placeholder="Minimum 8 characters"
            {...register('password')}
          />
          {errors.password && (
            <p className="text-sm text-red-500 mb-2">{errors.password.message}</p>
          )}

          <Input
            label="Confirm Password"
            type="password"
            placeholder="Re-enter your password"
            {...register('confirmPassword')}
          />
          {errors.confirmPassword && (
            <p className="text-sm text-red-500 mb-2">{errors.confirmPassword.message}</p>
          )}

          <div className="flex items-center mb-4">
            <input
              id="agreeTOS"
              type="checkbox"
              {...register('agreeTOS')}
              className={`mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded ${
                isDarkMode ? 'bg-gray-800 border-gray-600' : 'bg-white'
              }`}
            />
            <label htmlFor="agreeTOS" className={`text-sm ${
              isDarkMode ? 'text-gray-300' : 'text-gray-700'
            }`}>
              I agree to the{' '}
              <a 
                href="/terms" 
                className={`hover:underline ${
                  isDarkMode ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-700'
                }`}
                target="_blank"
              >
                Terms of Service
              </a>
            </label>
          </div>
          {errors.agreeTOS && (
            <p className="text-sm text-red-500 mb-2">{errors.agreeTOS.message}</p>
          )}

          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Creating…' : 'Sign Up'}
          </Button>
        </form>

        <div className="mt-4 text-center">
          <Link 
            to="/login" 
            className={`text-sm hover:underline ${
              isDarkMode ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-700'
            }`}
          >
            Already have an account? Log in
          </Link>
        </div>
      </div>
    </div>
  );
}