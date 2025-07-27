import { useForm } from 'react-hook-form';
import { useState, useEffect, useContext } from 'react';
import Input from '../../components/Input';
import Button from '../../components/Button';
import { useDarkMode } from '../../contexts/DarkModeContext';
import AuthContext from '../../contexts/AuthContext';
import { getUserProfile, updateUserProfile as updateProfileAPI, uploadProfilePicture } from '../../services/streamApi';

type ProfileForm = {
  username: string;
  email: string;
  displayName: string;
};

export default function Profile() {
  const { isDarkMode } = useDarkMode();
  const { token, updateUserProfile } = useContext(AuthContext);
  const [loading, setLoading] = useState(true);
  const [profilePicture, setProfilePicture] = useState<string | null>(null);
  const [uploadingPicture, setUploadingPicture] = useState(false);
  const [imageLoadError, setImageLoadError] = useState(false);
  
  const { register, handleSubmit, formState: { errors, isSubmitting }, reset } = useForm<ProfileForm>({
    mode: 'onBlur',
  });

  // Load user profile data on component mount
  useEffect(() => {
    const loadProfile = async () => {
      if (!token) return;
      
      try {
        const profile = await getUserProfile(token);
        
        // Reset form with actual user data
        reset({
          username: profile.username,
          email: profile.email,
          displayName: profile.displayName,
        });
        
        setProfilePicture(profile.profilePicture || null);
        setImageLoadError(false); // Reset error state when loading new profile
      } catch (error) {
        console.error('Failed to load profile:', error);
        alert('Failed to load profile data');
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, [token, reset]);

  // Handle profile picture upload
  const handlePictureUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !token) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file (JPG, PNG, etc.)');
      return;
    }

    // Validate file size (5MB limit)
    const maxSize = 5 * 1024 * 1024; // 5MB in bytes
    if (file.size > maxSize) {
      alert('File size must be less than 5MB');
      return;
    }

    setUploadingPicture(true);
    try {
      const data = await uploadProfilePicture(token, file);
      
      // Update local state
      setProfilePicture(data.profilePictureUrl);
      setImageLoadError(false); // Reset error state on successful upload
      
      // Update auth context
      updateUserProfile({
        profilePicture: data.profilePictureUrl,
      });

      alert(data.message || 'Profile picture updated successfully!');
    } catch (error) {
      console.error('Profile picture upload failed:', error);
      alert('Failed to upload profile picture. Please try again.');
    } finally {
      setUploadingPicture(false);
    }
  };

  const onSubmit = async (data: ProfileForm) => {
    if (!token) return;
    
    try {
      const response = await updateProfileAPI(token, data);
      
      // Update AuthContext with new user data
      updateUserProfile({
        username: response.user.username,
        email: response.user.email,
        displayName: response.user.displayName,
        profilePicture: response.user.profilePicture,
      });
      
      // Update local profile picture state
      if (response.user.profilePicture) {
        setProfilePicture(response.user.profilePicture);
        setImageLoadError(false); // Reset error state when updating profile
      }
      
      alert(response.message || 'Profile updated successfully');
    } catch (error) {
      console.error('Failed to update profile:', error);
      alert(error instanceof Error ? error.message : 'Failed to update profile');
    }
  };

  // Show loading state while fetching profile data
  if (loading) {
    return (
      <div className={`min-h-screen ${isDarkMode ? 'bg-black' : 'bg-gray-50'}`}>
        <div className="max-w-3xl mx-auto py-8 px-4">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
              <p className={`text-lg ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                Loading profile...
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

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


          <div className={`mb-6 p-4 rounded-lg ${
            isDarkMode ? 'bg-gray-800 border border-gray-700' : 'bg-gray-50 border border-gray-200'
          }`}>
            <h3 className={`text-sm font-medium mb-2 ${
              isDarkMode ? 'text-gray-300' : 'text-gray-700'
            }`}>
              Profile Picture
            </h3>
            <div className="flex items-center space-x-4">
              <div className={`w-20 h-20 rounded-full flex items-center justify-center text-xl font-semibold overflow-hidden border border-gray-600 ${
                isDarkMode ? 'bg-black text-white' : 'bg-black text-white'
              }`}>
                {profilePicture && !imageLoadError ? (
                  <img 
                    src={profilePicture} 
                    alt="Profile" 
                    className="w-20 h-20 rounded-full object-cover"
                    onError={() => setImageLoadError(true)}
                    onLoad={() => setImageLoadError(false)}
                  />
                ) : (
                  'U'
                )}
              </div>
              <div>
                <input
                  type="file"
                  id="profile-picture-input"
                  accept="image/*"
                  onChange={handlePictureUpload}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => document.getElementById('profile-picture-input')?.click()}
                  disabled={uploadingPicture}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    uploadingPicture ? 'opacity-50 cursor-not-allowed' : ''
                  } ${
                    isDarkMode
                      ? 'bg-gray-700 text-gray-300 hover:bg-gray-600 hover:text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {uploadingPicture ? 'Uploading...' : 'Change Picture'}
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