import { useContext, useState } from 'react';
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
    enable2FA: z.boolean().optional(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Passwords do not match',
  });

type SignupFormValues = z.infer<typeof SignupSchema>;

export default function Signup() {
  const { signup } = useContext(AuthContext);
  const { isDarkMode } = useDarkMode();
  const [apiError, setApiError] = useState<string | null>(null);
  const [showTermsModal, setShowTermsModal] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignupFormValues>({
    resolver: zodResolver(SignupSchema),
    mode: 'onBlur',
  });

  const onSubmit = async (data: SignupFormValues) => {
    setApiError(null);
    try {
      await signup(data.username, data.email, data.password, data.enable2FA);
    } catch (err) {
      console.error('Signup failed', err);
      setApiError(err instanceof Error ? err.message : 'Signup failed');
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
        {apiError && (
          <div className="mb-4 p-3 text-sm text-red-500 bg-red-50 border border-red-200 rounded-md dark:bg-red-900/20 dark:border-red-800">
            {apiError}
          </div>
        )}
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
              Enable two-factor authentication (recommended for extra security + permanent login)
            </label>
          </div>

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
              <button
                type="button"
                onClick={() => setShowTermsModal(true)}
                className={`hover:underline ${
                  isDarkMode ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-700'
                }`}
              >
                Terms of Service
              </button>
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

      {/* Terms of Service Modal */}
      {showTermsModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className={`w-full max-w-2xl max-h-[80vh] rounded-lg shadow-lg ${
            isDarkMode ? 'bg-gray-900 border border-gray-800' : 'bg-white'
          }`}>
            {/* Modal Header */}
            <div className={`flex items-center justify-between p-6 border-b ${
              isDarkMode ? 'border-gray-800' : 'border-gray-200'
            }`}>
              <h2 className={`text-xl font-bold ${
                isDarkMode ? 'text-white' : 'text-gray-900'
              }`}>
                Terms of Service
              </h2>
              <button
                type="button"
                onClick={() => setShowTermsModal(false)}
                className={`p-2 rounded-md transition-colors ${
                  isDarkMode 
                    ? 'text-gray-400 hover:text-gray-300 hover:bg-gray-800' 
                    : 'text-gray-600 hover:text-gray-700 hover:bg-gray-100'
                }`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 max-h-[60vh] overflow-y-auto">
              <div className={`prose max-w-none ${isDarkMode ? 'prose-invert' : ''}`}>
                <section className="mb-6">
                  <h3 className={`text-lg font-semibold mb-3 ${
                    isDarkMode ? 'text-white' : 'text-gray-900'
                  }`}>
                    1. Acceptance of Terms
                  </h3>
                  <p className={`text-sm leading-relaxed mb-3 ${
                    isDarkMode ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                    Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.
                  </p>
                </section>

                <section className="mb-6">
                  <h3 className={`text-lg font-semibold mb-3 ${
                    isDarkMode ? 'text-white' : 'text-gray-900'
                  }`}>
                    2. User Accounts
                  </h3>
                  <p className={`text-sm leading-relaxed mb-3 ${
                    isDarkMode ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                    Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum. Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam rem aperiam.
                  </p>
                </section>

                <section className="mb-6">
                  <h3 className={`text-lg font-semibold mb-3 ${
                    isDarkMode ? 'text-white' : 'text-gray-900'
                  }`}>
                    3. Streaming Content
                  </h3>
                  <p className={`text-sm leading-relaxed mb-3 ${
                    isDarkMode ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                    Neque porro quisquam est, qui dolorem ipsum quia dolor sit amet, consectetur, adipisci velit, sed quia non numquam eius modi tempora incidunt ut labore et dolore magnam aliquam quaerat voluptatem.
                  </p>
                  <ul className={`list-disc list-inside text-sm mb-3 ${
                    isDarkMode ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                    <li>Quis autem vel eum iure reprehenderit qui in ea voluptate</li>
                    <li>Velit esse quam nihil molestiae consequatur</li>
                    <li>Vel illum qui dolorem eum fugiat quo voluptas nulla pariatur</li>
                    <li>At vero eos et accusamus et iusto odio dignissimos</li>
                  </ul>
                </section>

                <section className="mb-6">
                  <h3 className={`text-lg font-semibold mb-3 ${
                    isDarkMode ? 'text-white' : 'text-gray-900'
                  }`}>
                    4. Privacy and Data Protection
                  </h3>
                  <p className={`text-sm leading-relaxed mb-3 ${
                    isDarkMode ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                    Ducimus qui blanditiis praesentium voluptatum deleniti atque corrupti quos dolores et quas molestias excepturi sint occaecati cupiditate non provident, similique sunt in culpa qui officia deserunt mollitia animi.
                  </p>
                </section>

                <section className="mb-6">
                  <h3 className={`text-lg font-semibold mb-3 ${
                    isDarkMode ? 'text-white' : 'text-gray-900'
                  }`}>
                    5. Prohibited Activities
                  </h3>
                  <p className={`text-sm leading-relaxed mb-3 ${
                    isDarkMode ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                    Et harum quidem rerum facilis est et expedita distinctio. Nam libero tempore, cum soluta nobis est eligendi optio cumque nihil impedit quo minus id quod maxime placeat facere possimus.
                  </p>
                </section>

                <section className="mb-6">
                  <h3 className={`text-lg font-semibold mb-3 ${
                    isDarkMode ? 'text-white' : 'text-gray-900'
                  }`}>
                    6. Termination
                  </h3>
                  <p className={`text-sm leading-relaxed mb-3 ${
                    isDarkMode ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                    Temporibus autem quibusdam et aut officiis debitis aut rerum necessitatibus saepe eveniet ut et voluptates repudiandae sint et molestiae non recusandae.
                  </p>
                </section>

                <section className="mb-6">
                  <h3 className={`text-lg font-semibold mb-3 ${
                    isDarkMode ? 'text-white' : 'text-gray-900'
                  }`}>
                    7. Contact Information
                  </h3>
                  <p className={`text-sm leading-relaxed mb-3 ${
                    isDarkMode ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                    Ut enim ad minima veniam, quis nostrum exercitationem ullam corporis suscipit laboriosam, nisi ut aliquid ex ea commodi consequatur.
                  </p>
                </section>

                <div className={`mt-6 pt-4 border-t ${
                  isDarkMode ? 'border-gray-700' : 'border-gray-200'
                }`}>
                  <p className={`text-xs ${
                    isDarkMode ? 'text-gray-400' : 'text-gray-600'
                  }`}>
                    Last updated: {new Date().toLocaleDateString('en-US', { 
                      year: 'numeric', 
                      month: 'long', 
                      day: 'numeric' 
                    })}
                  </p>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className={`flex justify-end p-6 border-t ${
              isDarkMode ? 'border-gray-800' : 'border-gray-200'
            }`}>
              <Button
                type="button"
                onClick={() => setShowTermsModal(false)}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}