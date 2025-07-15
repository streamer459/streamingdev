import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import Input from '../../components/Input';
import Button from '../../components/Button';
import { useDarkMode } from '../../contexts/DarkModeContext';

type ProfileForm = {
  username: string;
  email: string;
  displayName: string;
  bio: string;
};

export default function Profile() {
  const { isDarkMode } = useDarkMode();
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<ProfileForm>({
    mode: 'onBlur',
    defaultValues: {
      username: 'testuser', // TODO: Load from auth context or API
      email: 'test@example.com',
      displayName: 'Test User',
      bio: 'This is my bio description.',
    }
  });

  const onSubmit = async (data: ProfileForm) => {
    try {
      // TODO: call your API to update profile
      console.log('Profile update:', data);
      await new Promise(r => setTimeout(r, 500));
      alert('Profile updated successfully');
    } catch (err) {
      console.error(err);
      alert('Failed to update profile');
    }
  };

  return (
    <div className={`min-h-screen ${isDarkMode ? 'bg-black' : 'bg-gray-50'}`}>
      <div className="max-w-3xl mx-auto py-8 px-4">
        <h2 className={`text-2xl font-bold mb-6 ${
          isDarkMode ? 'text-white' : 'text-gray-900'
        }`}>
          Profile Settings
        </h2>
        
        <form 
          onSubmit={handleSubmit(onSubmit)} 
          className={`p-6 rounded-lg shadow-md ${
            isDarkMode 
              ? 'bg-gray-900 border border-gray-800' 
              : 'bg-white'
          }`}
        >
          <Input
            label="Username"
            type="text"
            {...register('username', { 
              required: 'Username is required',
              minLength: { value: 3, message: 'Username must be at least 3 characters' }
            })}
          />
          {errors.username && (
            <p className="text-sm text-red-500 mb-2">{errors.username.message}</p>
          )}

          <Input
            label="Email"
            type="email"
            {...register('email', { 
              required: 'Email is required',
              pattern: { value: /^\S+@\S+$/i, message: 'Invalid email address' }
            })}
          />
          {errors.email && (
            <p className="text-sm text-red-500 mb-2">{errors.email.message}</p>
          )}

          <Input
            label="Display Name"
            type="text"
            {...register('displayName', { 
              required: 'Display name is required' 
            })}
          />
          {errors.displayName && (
            <p className="text-sm text-red-500 mb-2">{errors.displayName.message}</p>
          )}

          <div className="mb-4">
            <label 
              htmlFor="bio" 
              className={`block text-sm font-medium mb-2 ${
                isDarkMode ? 'text-gray-300' : 'text-gray-700'
              }`}
            >
              Bio
            </label>
            <textarea
              id="bio"
              rows={4}
              maxLength={500}
              {...register('bio')}
              className={`w-full px-3 py-2 border rounded-lg shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none ${
                isDarkMode
                  ? 'bg-gray-800 border-gray-600 text-white placeholder-gray-400'
                  : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
              }`}
              placeholder="Tell us about yourself..."
            />
            <p className={`text-xs mt-1 ${
              isDarkMode ? 'text-gray-400' : 'text-gray-500'
            }`}>
              Maximum 500 characters
            </p>
          </div>

          <div className={`mb-6 p-4 rounded-lg ${
            isDarkMode ? 'bg-gray-800 border border-gray-700' : 'bg-gray-50 border border-gray-200'
          }`}>
            <h3 className={`text-sm font-medium mb-2 ${
              isDarkMode ? 'text-gray-300' : 'text-gray-700'
            }`}>
              Profile Picture
            </h3>
            <div className="flex items-center space-x-4">
              <div className={`w-16 h-16 rounded-full flex items-center justify-center text-xl font-semibold ${
                isDarkMode ? 'bg-blue-600 text-white' : 'bg-blue-500 text-white'
              }`}>
                TU
              </div>
              <div>
                <button
                  type="button"
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    isDarkMode
                      ? 'bg-gray-700 text-gray-300 hover:bg-gray-600 hover:text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Change Picture
                </button>
                <p className={`text-xs mt-1 ${
                  isDarkMode ? 'text-gray-400' : 'text-gray-500'
                }`}>
                  JPG, PNG up to 5MB
                </p>
              </div>
            </div>
          </div>

          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Saving…' : 'Save Changes'}
          </Button>
        </form>
      </div>
    </div>
  );
}