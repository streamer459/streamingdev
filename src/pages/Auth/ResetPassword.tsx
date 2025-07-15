import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import Input from '../../components/Input';
import Button from '../../components/Button';
import { Link } from 'react-router-dom';
import { useDarkMode } from '../../contexts/DarkModeContext';

type ResetRequestForm = {
  email: string;
};

export default function ResetPassword() {
  const [sent, setSent] = useState(false);
  const { isDarkMode } = useDarkMode();
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<ResetRequestForm>();

  const onSubmit = async (data: ResetRequestForm) => {
    // TODO: call your API to send a reset email
    console.log('Requesting password reset for:', data.email);
    await new Promise(r => setTimeout(r, 500)); // simulate network
    setSent(true);
  };

  if (sent) {
    return (
      <div className={`flex items-center justify-center min-h-screen ${
        isDarkMode ? 'bg-black' : 'bg-gray-50'
      }`}>
        <div className={`w-full max-w-md p-8 rounded-xl shadow-md text-center ${
          isDarkMode 
            ? 'bg-gray-900 border border-gray-800' 
            : 'bg-white'
        }`}>
          <h2 className={`text-2xl font-semibold mb-4 ${
            isDarkMode ? 'text-white' : 'text-gray-900'
          }`}>
            Check your email
          </h2>
          <p className={`mb-6 ${
            isDarkMode ? 'text-gray-300' : 'text-gray-600'
          }`}>
            We've sent a password reset link to your email address.
          </p>
          <Link 
            to="/login" 
            className={`hover:underline ${
              isDarkMode ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-700'
            }`}
          >
            Back to Log In
          </Link>
        </div>
      </div>
    );
  }

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
          Reset Password
        </h2>
        <p className={`text-sm mb-4 ${
          isDarkMode ? 'text-gray-300' : 'text-gray-600'
        }`}>
          Enter your email below and we'll send you a link to reset your password.
        </p>
        <form onSubmit={handleSubmit(onSubmit)}>
          <Input
            label="Email"
            type="email"
            placeholder="you@example.com"
            {...register('email', { required: 'Email is required' })}
          />
          {errors.email && (
            <p className="text-sm text-red-500 mb-2">{errors.email.message}</p>
          )}

          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Sending…' : 'Send Reset Link'}
          </Button>
        </form>

        <div className="mt-4 text-center">
          <Link 
            to="/login" 
            className={`text-sm hover:underline ${
              isDarkMode ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-700'
            }`}
          >
            Back to Log In
          </Link>
        </div>
      </div>
    </div>
  );
}