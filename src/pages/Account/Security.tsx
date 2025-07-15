import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import Input from '../../components/Input';
import Button from '../../components/Button';
import { useDarkMode } from '../../contexts/DarkModeContext';

type PasswordForm = {
  currentPassword: string;
  newPassword: string;
  confirmNewPassword: string;
  enable2FA: boolean;
  enable2FACode?: string;
};

export default function Security() {
  const { isDarkMode } = useDarkMode();
  const { register, handleSubmit, watch, formState: { errors, isSubmitting } } = useForm<PasswordForm>({
    mode: 'onBlur',
  });
  const [twoFAEnabled, setTwoFAEnabled] = useState(false);

  const onSubmit = async (data: PasswordForm) => {
    try {
      // TODO: call your API to update password and toggle 2FA
      console.log('Security update:', data);
      await new Promise(r => setTimeout(r, 500));
      alert('Security settings updated');
    } catch (err) {
      console.error(err);
      alert('Failed to update security');
    }
  };

  // Show twoFA inputs only if toggled on
  const enable2FAWatch = watch('enable2FA', false);

  return (
    <div className={`min-h-screen ${isDarkMode ? 'bg-black' : 'bg-gray-50'}`}>
      <div className="max-w-3xl mx-auto py-8 px-4">
        <h2 className={`text-2xl font-bold mb-6 ${
          isDarkMode ? 'text-white' : 'text-gray-900'
        }`}>
          Security Settings
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
            label="Current Password"
            type="password"
            {...register('currentPassword', { required: 'Current password is required' })}
          />
          {errors.currentPassword && (
            <p className="text-sm text-red-500 mb-2">{errors.currentPassword.message}</p>
          )}

          <Input
            label="New Password"
            type="password"
            {...register('newPassword', {
              required: 'New password is required',
              minLength: { value: 8, message: 'Password must be ≥8 chars' },
            })}
          />
          {errors.newPassword && (
            <p className="text-sm text-red-500 mb-2">{errors.newPassword.message}</p>
          )}

          <Input
            label="Confirm New Password"
            type="password"
            {...register('confirmNewPassword', {
              required: 'Please confirm your new password',
              validate: (val, formValues) =>
                val === formValues.newPassword || 'Passwords do not match',
            })}
          />
          {errors.confirmNewPassword && (
            <p className="text-sm text-red-500 mb-2">{errors.confirmNewPassword.message}</p>
          )}

          <div className="flex items-center mb-4">
            <input
              id="enable2FA"
              type="checkbox"
              {...register('enable2FA')}
              className={`mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded ${
                isDarkMode ? 'bg-gray-800 border-gray-600' : 'bg-white'
              }`}
            />
            <label htmlFor="enable2FA" className={`text-sm ${
              isDarkMode ? 'text-gray-300' : 'text-gray-700'
            }`}>
              Enable Two-Factor Authentication
            </label>
          </div>

          {enable2FAWatch && (
            <div className={`mb-4 p-4 rounded-lg ${
              isDarkMode 
                ? 'bg-gray-800 border border-gray-700' 
                : 'bg-gray-50 border border-gray-200'
            }`}>
              <p className={`text-sm mb-2 ${
                isDarkMode ? 'text-gray-300' : 'text-gray-700'
              }`}>
                Scan the QR code with your authenticator app and enter the generated code below.
              </p>
              
              {/* TODO: QR Code placeholder */}
              <div className={`w-32 h-32 mx-auto mb-4 rounded-lg border-2 border-dashed flex items-center justify-center ${
                isDarkMode 
                  ? 'border-gray-600 bg-gray-700' 
                  : 'border-gray-300 bg-gray-100'
              }`}>
                <span className={`text-xs text-center ${
                  isDarkMode ? 'text-gray-400' : 'text-gray-500'
                }`}>
                  QR Code<br />Placeholder
                </span>
              </div>
              
              <Input
                label="2FA Code"
                type="text"
                maxLength={6}
                placeholder="000000"
                {...register('enable2FACode', {
                  required: enable2FAWatch ? '2FA code is required' : false,
                  pattern: { value: /^[0-9]{6}$/, message: 'Enter a valid 6-digit code' },
                })}
              />
              {errors.enable2FACode && (
                <p className="text-sm text-red-500 mb-2">{errors.enable2FACode.message}</p>
              )}
            </div>
          )}

          <div className={`mb-6 p-4 rounded-lg ${
            isDarkMode 
              ? 'bg-gray-800 border border-gray-700' 
              : 'bg-blue-50 border border-blue-200'
          }`}>
            <h3 className={`text-sm font-medium mb-2 flex items-center ${
              isDarkMode ? 'text-blue-400' : 'text-blue-800'
            }`}>
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              Security Tips
            </h3>
            <ul className={`text-xs space-y-1 ${
              isDarkMode ? 'text-gray-300' : 'text-blue-700'
            }`}>
              <li>• Use a strong password with at least 8 characters</li>
              <li>• Include uppercase, lowercase, and numbers</li>
              <li>• Enable 2FA for additional security</li>
              <li>• Don't reuse passwords from other sites</li>
            </ul>
          </div>

          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Saving…' : 'Save Changes'}
          </Button>
        </form>
      </div>
    </div>
  );
}