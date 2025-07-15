import React, { useContext } from 'react';
import { useForm } from 'react-hook-form';
import Input from '../../components/Input';
import Button from '../../components/Button';
import AuthContext from '../../contexts/AuthContext';

type TwoFactorForm = {
  code: string;
};

export default function TwoFactor() {
  const { login } = useContext(AuthContext);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting }
  } = useForm<TwoFactorForm>();

  const onSubmit = async (data: TwoFactorForm) => {
    // TODO: call your API to verify 2FA code
    console.log('Verifying 2FA code:', data.code);
    await new Promise(r => setTimeout(r, 500)); // simulate network

    // On success: re-use login stub to navigate to /home
    // In a real flow you’d store a temporary token, then finish login here
    await login('test@example.com', 'password', true);
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="w-full max-w-xs bg-white p-8 rounded-xl shadow-md text-center">
        <h2 className="text-2xl font-bold mb-6">Two-Factor Authentication</h2>
        <p className="mb-4 text-gray-600">Enter the 6-digit code from your authenticator app.</p>
        <form onSubmit={handleSubmit(onSubmit)}>
          <Input
            label="Authentication Code"
            type="text"
            placeholder="123456"
            maxLength={6}
            {...register('code', {
              required: 'Code is required',
              pattern: {
                value: /^[0-9]{6}$/,
                message: 'Enter a valid 6-digit code'
              }
            })}
          />
          {errors.code && <p className="text-sm text-red-500 mb-2">{errors.code.message}</p>}

          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Verifying…' : 'Verify Code'}
          </Button>
        </form>
      </div>
    </div>
  );
}
