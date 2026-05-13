import React, { useState } from 'react';
import { Package, User, LayoutDashboard, FileBarChart, LogOut, Users } from 'lucide-react';
import ProfileModal from './ProfileModal/ProfileModal';
import './Header.css';

const Header = ({ userName, userEmail, activeTab, setActiveTab, onLogout, onUpdateProfile, onChangePassword, userRole }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleProfileClick = () => {
    setIsModalOpen(true);
  };

  const handleUpdateProfile = (profileData) => {
    if (onUpdateProfile) {
      onUpdateProfile(profileData);
    }
    console.log('Profile updated:', profileData);
  };

  const handleChangePassword = (passwordData) => {
    if (onChangePassword) {
      onChangePassword(passwordData);
    }
    console.log('Password changed:', passwordData);
  };

  return (
    <>
      <header className="top-header">
        <div className="header-content">
          <div className="header-left">
            <div className="logo-box">
              <Package size={24} color="white" />
            </div>
            <h2 className="header-title">Reel Stock Management</h2>
          </div>

          <div className="header-center">
            <nav className="header-nav">
              <button
                type="button"
                className={`nav-tab ${activeTab === 'reelstockmanagement' ? 'active' : ''}`}
                onClick={() => setActiveTab('reelstockmanagement')}
              >
                <LayoutDashboard size={18} />
                <span>Reel Stock Management</span>
              </button>
              <button
                type="button"
                className={`nav-tab ${activeTab === 'report' ? 'active' : ''}`}
                onClick={() => setActiveTab('report')}
              >
                <FileBarChart size={18} />
                <span>Reports</span>
              </button>
              {userRole === 'admin' && (
                <button
                  type="button"
                  className={`nav-tab ${activeTab === 'users' ? 'active' : ''}`}
                  onClick={() => setActiveTab('users')}
                >
                  <Users size={18} />
                  <span>Users</span>
                </button>
              )}
            </nav>
          </div>

          <div className="header-right">
            <div className="profile-section">
              <div className="user-details text-end">
                <div className="user-name">{userName || 'User'}</div>
              </div>
              <button 
                onClick={handleProfileClick} 
                className="avatar-box" 
                title="Profile Settings"
                style={{ cursor: 'pointer' }}
              >
                <User size={20} />
              </button>
              <button onClick={onLogout} className="logout-btn" title="Logout">
                <LogOut size={18} />
              </button>
            </div>
          </div>
        </div>
      </header>

      <ProfileModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        userData={{
          name: userName,
          email: userEmail || 'user@example.com',
          phone: '',
          department: ''
        }}
        onUpdateProfile={handleUpdateProfile}
        onChangePassword={handleChangePassword}
      />
    </>
  );
};

export default Header;