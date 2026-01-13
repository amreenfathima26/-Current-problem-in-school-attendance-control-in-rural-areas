import React, { useState } from 'react';
import { useMutation, useQueryClient } from 'react-query';
import { useAuth } from '../contexts/AuthContext';
import {
  User,
  Mail,
  Phone,
  Building,
  Shield,
  Save,
  Edit,
  Key,
  Bell,
} from 'lucide-react';
import toast from 'react-hot-toast';

const Profile = () => {
  const { user, updateProfile } = useAuth();
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    first_name: user?.first_name || '',
    last_name: user?.last_name || '',
    email: user?.email || '',
    phone_number: user?.phone_number || '',
    password: '',
    confirm_password: '',
  });
  const [showPasswordSection, setShowPasswordSection] = useState(false);

  const updateProfileMutation = useMutation(updateProfile, {
    onSuccess: () => {
      queryClient.invalidateQueries(['profile']);
      setIsEditing(false);
      toast.success('Profile updated successfully!');
    },
    onError: (error) => {
      toast.error('Failed to update profile');
      console.error('Error:', error);
    },
  });

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (showPasswordSection) {
      if (formData.password !== formData.confirm_password) {
        toast.error('Passwords do not match');
        return;
      }
      if (formData.password.length < 6) {
        toast.error('Password must be at least 6 characters');
        return;
      }
    }

    // Remove empty password fields if not changing password
    const dataToSend = { ...formData };
    if (!showPasswordSection || !dataToSend.password) {
      delete dataToSend.password;
      delete dataToSend.confirm_password;
    }

    updateProfileMutation.mutate(dataToSend);
  };

  const handleCancel = () => {
    setFormData({
      first_name: user?.first_name || '',
      last_name: user?.last_name || '',
      email: user?.email || '',
      phone_number: user?.phone_number || '',
      password: '',
      confirm_password: '',
    });
    setIsEditing(false);
    setShowPasswordSection(false);
  };

  const getRoleDisplayName = (role) => {
    switch (role) {
      case 'admin':
        return 'Administrator';
      case 'teacher':
        return 'Teacher';
      case 'auxiliary':
        return 'Auxiliary Staff';
      case 'student':
        return 'Student';
      default:
        return role;
    }
  };

  const getRoleColor = (role) => {
    switch (role) {
      case 'admin':
        return 'bg-red-100 text-red-800';
      case 'teacher':
        return 'bg-blue-100 text-blue-800';
      case 'auxiliary':
        return 'bg-yellow-100 text-yellow-800';
      case 'student':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-4 -mt-4">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Profile</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage your account information and preferences
          </p>
        </div>
        {!isEditing && (
          <button
            onClick={() => setIsEditing(true)}
            className="btn btn-outline flex items-center"
          >
            <Edit className="h-4 w-4 mr-2" />
            Edit Profile
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Information */}
        <div className="lg:col-span-2">
          <div className="card">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-medium text-gray-900">Profile Information</h3>
              {isEditing && (
                <div className="flex space-x-2">
                  <button
                    onClick={handleCancel}
                    className="btn btn-secondary"
                    disabled={updateProfileMutation.isLoading}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSubmit}
                    className="btn btn-primary flex items-center"
                    disabled={updateProfileMutation.isLoading}
                  >
                    <Save className="h-4 w-4 mr-2" />
                    {updateProfileMutation.isLoading ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              )}
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="form-label">First Name</label>
                  {isEditing ? (
                    <input
                      type="text"
                      name="first_name"
                      value={formData.first_name}
                      onChange={handleChange}
                      className="form-input"
                      required
                    />
                  ) : (
                    <div className="flex items-center p-3 bg-gray-50 rounded-md">
                      <User className="h-5 w-5 text-gray-400 mr-3" />
                      <span className="text-gray-900">{user?.first_name || 'Not provided'}</span>
                    </div>
                  )}
                </div>

                <div>
                  <label className="form-label">Last Name</label>
                  {isEditing ? (
                    <input
                      type="text"
                      name="last_name"
                      value={formData.last_name}
                      onChange={handleChange}
                      className="form-input"
                      required
                    />
                  ) : (
                    <div className="flex items-center p-3 bg-gray-50 rounded-md">
                      <User className="h-5 w-5 text-gray-400 mr-3" />
                      <span className="text-gray-900">{user?.last_name || 'Not provided'}</span>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="form-label">Email Address</label>
                {isEditing ? (
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    className="form-input"
                    required
                  />
                ) : (
                  <div className="flex items-center p-3 bg-gray-50 rounded-md">
                    <Mail className="h-5 w-5 text-gray-400 mr-3" />
                    <span className="text-gray-900">{user?.email || 'Not provided'}</span>
                  </div>
                )}
              </div>

              <div>
                <label className="form-label">Phone Number</label>
                {isEditing ? (
                  <input
                    type="tel"
                    name="phone_number"
                    value={formData.phone_number}
                    onChange={handleChange}
                    className="form-input"
                  />
                ) : (
                  <div className="flex items-center p-3 bg-gray-50 rounded-md">
                    <Phone className="h-5 w-5 text-gray-400 mr-3" />
                    <span className="text-gray-900">{user?.phone_number || 'Not provided'}</span>
                  </div>
                )}
              </div>

              <div>
                <label className="form-label">Username</label>
                <div className="flex items-center p-3 bg-gray-50 rounded-md">
                  <User className="h-5 w-5 text-gray-400 mr-3" />
                  <span className="text-gray-900">{user?.username}</span>
                </div>
              </div>
            </form>
          </div>
        </div>

        {/* Account Information */}
        <div className="space-y-6">
          {/* Account Status */}
          <div className="card">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Account Information</h3>

            <div className="space-y-4">
              <div>
                <label className="form-label">Role</label>
                <div className="flex items-center p-3 bg-gray-50 rounded-md">
                  <Shield className="h-5 w-5 text-gray-400 mr-3" />
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getRoleColor(user?.role)}`}>
                    {getRoleDisplayName(user?.role)}
                  </span>
                </div>
              </div>

              <div>
                <label className="form-label">School</label>
                <div className="flex items-center p-3 bg-gray-50 rounded-md">
                  <Building className="h-5 w-5 text-gray-400 mr-3" />
                  <span className="text-gray-900">{user?.school_name || 'Not assigned'}</span>
                </div>
              </div>

              <div>
                <label className="form-label">Account Status</label>
                <div className="flex items-center p-3 bg-gray-50 rounded-md">
                  <div className={`h-2 w-2 rounded-full mr-3 ${user?.is_active ? 'bg-green-400' : 'bg-red-400'}`}></div>
                  <span className="text-gray-900">{user?.is_active ? 'Active' : 'Inactive'}</span>
                </div>
              </div>

              <div>
                <label className="form-label">Last Login</label>
                <div className="flex items-center p-3 bg-gray-50 rounded-md">
                  <Bell className="h-5 w-5 text-gray-400 mr-3" />
                  <span className="text-gray-900">
                    {user?.last_login ? new Date(user.last_login).toLocaleString() : 'Never'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Security Settings */}
          <div className="card">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Security</h3>

            <div className="space-y-4">
              <div>
                <label className="form-label">Password</label>
                {!showPasswordSection ? (
                  <button
                    type="button"
                    onClick={() => {
                      setIsEditing(true);
                      setShowPasswordSection(true);
                    }}
                    className="w-full flex items-center justify-center p-3 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                  >
                    <Key className="h-5 w-5 mr-2" />
                    Change Password
                  </button>
                ) : (
                  <div className="space-y-4 p-4 border border-gray-200 rounded-md bg-gray-50">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
                      <input
                        type="password"
                        name="password"
                        value={formData.password}
                        onChange={handleChange}
                        className="form-input"
                        placeholder="Leave empty to keep current"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Confirm New Password</label>
                      <input
                        type="password"
                        name="confirm_password"
                        value={formData.confirm_password}
                        onChange={handleChange}
                        className="form-input"
                        placeholder="Confirm new password"
                      />
                    </div>
                    <div className="flex justify-end space-x-2">
                      <button
                        type="button"
                        onClick={() => setShowPasswordSection(false)}
                        className="text-sm text-gray-500 hover:text-gray-700"
                      >
                        Cancel Password Change
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="form-label">Two-Factor Authentication</label>
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
                  <span className="text-gray-900">Disabled</span>
                  <button className="text-blue-600 hover:text-blue-900 text-sm">
                    Enable
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* System Settings */}
          <div className="card">
            <h3 className="text-lg font-medium text-gray-900 mb-4">System Settings</h3>

            <div className="space-y-4">
              <div>
                <label className="form-label">Offline Sync</label>
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
                  <span className="text-gray-900">
                    {user?.is_offline_sync_enabled ? 'Enabled' : 'Disabled'}
                  </span>
                  <div className={`h-2 w-2 rounded-full ${user?.is_offline_sync_enabled ? 'bg-green-400' : 'bg-red-400'}`}></div>
                </div>
              </div>

              <div>
                <label className="form-label">Last Sync</label>
                <div className="flex items-center p-3 bg-gray-50 rounded-md">
                  <Bell className="h-5 w-5 text-gray-400 mr-3" />
                  <span className="text-gray-900">
                    {user?.last_sync ? new Date(user.last_sync).toLocaleString() : 'Never'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
