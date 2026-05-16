import React, { useState } from 'react';
import {
  User,
  Lock,
  X,
  Mail,
  Phone,
  Save,
  MapPin,
  AtSign,
  Users,
  Building,
  Clock
} from 'lucide-react';
import { showSuccess, showError } from '../../../utils/toastUtils';
import './ProfileModal.css';

function ProfileModal({ isOpen, onClose, userData, onUpdateProfile, onChangePassword }) {
  const [activeTab, setActiveTab] = useState('profile');
  const [formData, setFormData] = useState({
    username: userData?.username || '',
    firstName: userData?.firstName || '',
    lastName: userData?.lastName || '',
    email: userData?.email || '',
    phone: userData?.phone || '',
    location: userData?.location || userData?.city || '',
    hours: userData?.hours || '',
    companyName: userData?.companyName || ''
  });
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const handleProfileChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setErrors(prev => ({ ...prev, [name]: '' }));
  };

  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordData(prev => ({ ...prev, [name]: value }));
    setErrors(prev => ({ ...prev, [name]: '' }));
  };

  const validateProfile = () => {
    const newErrors = {};
    if (!formData.username.trim()) newErrors.username = 'Username required';
    if (!formData.firstName.trim()) newErrors.firstName = 'First name required';
    if (!formData.lastName.trim()) newErrors.lastName = 'Last name required';
    if (!formData.email.trim()) newErrors.email = 'Email required';
    else if (!/\S+@\S+\.\S+/.test(formData.email)) newErrors.email = 'Invalid email';
    if (!formData.phone.trim()) newErrors.phone = 'Phone required';
    else if (!/^\d{10}$/.test(formData.phone.replace(/\D/g, ''))) newErrors.phone = '10 digits required';
    return newErrors;
  };

  const validatePassword = () => {
    const newErrors = {};
    if (!passwordData.currentPassword) newErrors.currentPassword = 'Current password required';
    if (!passwordData.newPassword) newErrors.newPassword = 'New password required';
    else if (passwordData.newPassword.length < 6) newErrors.newPassword = 'Min 6 characters';
    if (!passwordData.confirmPassword) newErrors.confirmPassword = 'Confirm password required';
    else if (passwordData.newPassword !== passwordData.confirmPassword) newErrors.confirmPassword = 'Passwords do not match';
    return newErrors;
  };

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    const newErrors = validateProfile();
    
    if (Object.keys(newErrors).length === 0) {
      setIsLoading(true);
      try {
        if (onUpdateProfile) await onUpdateProfile(formData);
        showSuccess('Profile updated successfully! 🎉');
        setTimeout(() => onClose(), 1500);
      } catch (error) {
        showError(error.message || 'Failed to update profile');
      } finally {
        setIsLoading(false);
      }
    } else {
      setErrors(newErrors);
      const firstError = Object.values(newErrors)[0];
      showError(firstError);
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    const newErrors = validatePassword();
    
    if (Object.keys(newErrors).length === 0) {
      setIsLoading(true);
      try {
        if (onChangePassword) await onChangePassword(passwordData);
        showSuccess('Password changed successfully! 🔒');
        setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
        setTimeout(() => {
          setActiveTab('profile');
        }, 1500);
      } catch (error) {
        showError(error.message || 'Failed to change password');
      } finally {
        setIsLoading(false);
      }
    } else {
      setErrors(newErrors);
      const firstError = Object.values(newErrors)[0];
      showError(firstError);
    }
  };

  return (
    <>
      <div className="profile-modal-overlay" onClick={onClose} />
      <div className="profile-modal-container">
        <div className="profile-modal-header">
          <div className="profile-modal-header-main">
            <div className="profile-modal-header-left">
              <h3 className="profile-modal-title">Account Settings</h3>
              <p className="profile-modal-display-name">
                {formData.firstName || formData.lastName
                  ? `${formData.firstName} ${formData.lastName}`.trim()
                  : formData.username || 'Your profile'}
              </p>
            </div>
            <p className="profile-modal-header-desc">
              Update your contact details and account information. Fields marked with * are
              required.
            </p>
          </div>
          <button
            type="button"
            className="profile-modal-close-btn"
            onClick={onClose}
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        <div className="profile-modal-tabs-wrapper">
          <button
            className={`profile-modal-tab ${activeTab === 'profile' ? 'active' : ''}`}
            onClick={() => setActiveTab('profile')}
          >
            <User size={14} />
            <span>Profile</span>
          </button>
          <button
            className={`profile-modal-tab ${activeTab === 'password' ? 'active' : ''}`}
            onClick={() => setActiveTab('password')}
          >
            <Lock size={14} />
            <span>Password</span>
          </button>
        </div>

        <div className="profile-modal-body">
          {activeTab === 'profile' ? (
            <form onSubmit={handleProfileSubmit} className="profile-modal-form">
              <div className="profile-modal-contact-flex">
                <div className="profile-modal-contact-card">
                  <div className="profile-modal-contact-card-icon" aria-hidden="true">
                    <Mail size={16} />
                  </div>
                  <div className="profile-modal-contact-card-body">
                    <label htmlFor="email">Email *</label>
                    <input
                      type="email"
                      id="email"
                      name="email"
                      value={formData.email}
                      onChange={handleProfileChange}
                      placeholder="Email"
                      disabled={isLoading}
                    />
                    {errors.email && <span className="profile-modal-error">{errors.email}</span>}
                  </div>
                </div>

                <div className="profile-modal-contact-card">
                  <div className="profile-modal-contact-card-icon" aria-hidden="true">
                    <Phone size={16} />
                  </div>
                  <div className="profile-modal-contact-card-body">
                    <label htmlFor="phone">Phone *</label>
                    <input
                      type="tel"
                      id="phone"
                      name="phone"
                      value={formData.phone}
                      onChange={handleProfileChange}
                      placeholder="Phone"
                      disabled={isLoading}
                    />
                    {errors.phone && <span className="profile-modal-error">{errors.phone}</span>}
                  </div>
                </div>

                <div className="profile-modal-contact-card">
                  <div className="profile-modal-contact-card-icon" aria-hidden="true">
                    <MapPin size={16} />
                  </div>
                  <div className="profile-modal-contact-card-body">
                    <label htmlFor="location">Location</label>
                    <input
                      type="text"
                      id="location"
                      name="location"
                      value={formData.location}
                      onChange={handleProfileChange}
                      placeholder="City / area"
                      disabled={isLoading}
                    />
                  </div>
                </div>

                <div className="profile-modal-contact-card">
                  <div className="profile-modal-contact-card-icon" aria-hidden="true">
                    <Clock size={16} />
                  </div>
                  <div className="profile-modal-contact-card-body">
                    <label htmlFor="hours">Hours</label>
                    <input
                      type="text"
                      id="hours"
                      name="hours"
                      value={formData.hours}
                      onChange={handleProfileChange}
                      placeholder="e.g. 9 AM - 6 PM"
                      disabled={isLoading}
                    />
                  </div>
                </div>
              </div>

              <div className="profile-modal-form-row">
                <div className="profile-modal-form-group">
                  <label htmlFor="username">Username *</label>
                  <div className="profile-modal-input-wrapper">
                    <AtSign size={14} className="profile-modal-input-icon" />
                    <input
                      type="text"
                      id="username"
                      name="username"
                      value={formData.username}
                      onChange={handleProfileChange}
                      placeholder="Username"
                      disabled={isLoading}
                    />
                  </div>
                  {errors.username && <span className="profile-modal-error">{errors.username}</span>}
                </div>

                <div className="profile-modal-form-group">
                  <label htmlFor="firstName">First Name *</label>
                  <div className="profile-modal-input-wrapper">
                    <User size={14} className="profile-modal-input-icon" />
                    <input
                      type="text"
                      id="firstName"
                      name="firstName"
                      value={formData.firstName}
                      onChange={handleProfileChange}
                      placeholder="First name"
                      disabled={isLoading}
                    />
                  </div>
                  {errors.firstName && <span className="profile-modal-error">{errors.firstName}</span>}
                </div>
              </div>

              <div className="profile-modal-form-row">
                <div className="profile-modal-form-group">
                  <label htmlFor="lastName">Last Name *</label>
                  <div className="profile-modal-input-wrapper">
                    <Users size={14} className="profile-modal-input-icon" />
                    <input
                      type="text"
                      id="lastName"
                      name="lastName"
                      value={formData.lastName}
                      onChange={handleProfileChange}
                      placeholder="Last name"
                      disabled={isLoading}
                    />
                  </div>
                  {errors.lastName && <span className="profile-modal-error">{errors.lastName}</span>}
                </div>

                <div className="profile-modal-form-group">
                  <label htmlFor="companyName">Company</label>
                  <div className="profile-modal-input-wrapper">
                    <Building size={14} className="profile-modal-input-icon" />
                    <input
                      type="text"
                      id="companyName"
                      name="companyName"
                      value={formData.companyName}
                      onChange={handleProfileChange}
                      placeholder="Company name"
                      disabled={isLoading}
                    />
                  </div>
                </div>
              </div>

              <button type="submit" className="profile-modal-submit-btn" disabled={isLoading}>
                <Save size={14} />
                <span>{isLoading ? 'Saving...' : 'Save Changes'}</span>
              </button>
            </form>
          ) : (
            <form onSubmit={handlePasswordSubmit} className="profile-modal-form">
              <div className="profile-modal-form-row">
                <div className="profile-modal-form-group">
                  <label htmlFor="currentPassword">Current Password *</label>
                  <div className="profile-modal-input-wrapper">
                    <Lock size={14} className="profile-modal-input-icon" />
                    <input
                      type="password"
                      id="currentPassword"
                      name="currentPassword"
                      value={passwordData.currentPassword}
                      onChange={handlePasswordChange}
                      placeholder="Current password"
                      disabled={isLoading}
                    />
                  </div>
                  {errors.currentPassword && <span className="profile-modal-error">{errors.currentPassword}</span>}
                </div>
              </div>

              <div className="profile-modal-form-row">
                <div className="profile-modal-form-group">
                  <label htmlFor="newPassword">New Password *</label>
                  <div className="profile-modal-input-wrapper">
                    <Lock size={14} className="profile-modal-input-icon" />
                    <input
                      type="password"
                      id="newPassword"
                      name="newPassword"
                      value={passwordData.newPassword}
                      onChange={handlePasswordChange}
                      placeholder="New password (min 6 chars)"
                      disabled={isLoading}
                    />
                  </div>
                  {errors.newPassword && <span className="profile-modal-error">{errors.newPassword}</span>}
                </div>
              </div>

              <div className="profile-modal-form-row">
                <div className="profile-modal-form-group">
                  <label htmlFor="confirmPassword">Confirm Password *</label>
                  <div className="profile-modal-input-wrapper">
                    <Lock size={14} className="profile-modal-input-icon" />
                    <input
                      type="password"
                      id="confirmPassword"
                      name="confirmPassword"
                      value={passwordData.confirmPassword}
                      onChange={handlePasswordChange}
                      placeholder="Confirm password"
                      disabled={isLoading}
                    />
                  </div>
                  {errors.confirmPassword && <span className="profile-modal-error">{errors.confirmPassword}</span>}
                </div>
              </div>

              <button type="submit" className="profile-modal-submit-btn" disabled={isLoading}>
                <Save size={14} />
                <span>{isLoading ? 'Changing...' : 'Change Password'}</span>
              </button>
            </form>
          )}
        </div>
      </div>
    </>
  );
}

export default ProfileModal;