import React, { useEffect, useState } from 'react';
import Login from './components/Login/Login';
import Layout from './components/Layout/Layout';
import ReelStockManagement from './components/ReelStockManagement/ReelStockManagement';
import Report from './components/Report/Report';
import ProfileModal from './components/Header/ProfileModal/ProfileModal';
import UsersManagement from './components/UsersManagement/UsersManagement';
import ToastContainerComponent from './components/ToastContainer';
import {
  clearAuthToken,
  clearStoredUser,
  createReel,
  createReelsBulk,
  fetchCurrentUser,
  deleteReel,
  fetchReels,
  getStoredUser,
  login,
  setAuthToken,
  setStoredUser,
  toggleReel,
  updateReel,
  fetchUsers,
  fetchStockMinimums
} from './api/reelsApi';
import { showError, showSuccess } from './utils/toastUtils';
import { canUseReportsNav, resolveUserAccess } from './utils/userAccessUtils';
import './App.css';
import 'bootstrap/dist/css/bootstrap.min.css';

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userName, setUserName] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [userRole, setUserRole] = useState('');
  const [userAccess, setUserAccess] = useState(() => resolveUserAccess(null));
  const [activeTab, setActiveTab] = useState('reelstockmanagement');
  const [reels, setReels] = useState([]);
  const [users, setUsers] = useState([]);
  const [stockMinimums, setStockMinimums] = useState([]);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isLoadingReels, setIsLoadingReels] = useState(false);
  const [isAuthChecking, setIsAuthChecking] = useState(true);

  useEffect(() => {
    const restoreSession = async () => {
      const storedUser = getStoredUser();
      if (!storedUser) {
        setIsAuthChecking(false);
        return false;
      }

      try {
        const response = await fetchCurrentUser();
        setUserName(response.user.username);
        setUserEmail(response.user.email || '');
        setUserRole(response.user.role || 'user');
        setUserAccess(resolveUserAccess(response.user));
        setIsLoggedIn(true);
        return true;
      } catch (error) {
        clearAuthToken();
        clearStoredUser();
        return false;
      } finally {
        setIsAuthChecking(false);
      }
    };

    const loadReels = async () => {
      setIsLoadingReels(true);
      try {
        const data = await fetchReels();
        setReels(data);
      } catch (error) {
        showError(`Failed to load reels: ${error.message}`);
      } finally {
        setIsLoadingReels(false);
      }
    };

    restoreSession().then((isSessionActive) => {
      if (isSessionActive) {
        loadReels();
      }
    });
  }, []);

  const handleLogin = async (username, password) => {
    const response = await login(username, password);
    setAuthToken(response.token);
    setStoredUser(response.user);
    setUserName(response.user.username);
    setUserEmail(response.user.email || '');
    setUserRole(response.user.role || 'user');
    setUserAccess(resolveUserAccess(response.user));
    setIsLoggedIn(true);
    setIsLoadingReels(true);
    try {
      const data = await fetchReels();
      setReels(data);
      if (response.user.role === 'admin') {
        const minimums = await fetchStockMinimums();
        setStockMinimums(minimums);
      }
    } finally {
      setIsLoadingReels(false);
    }
    showSuccess(`Welcome back, ${response.user.username}!`);
    return true;
  };

  const handleLogout = () => {
    clearAuthToken();
    clearStoredUser();
    setIsLoggedIn(false);
    setUserName('');
    setUserEmail('');
    setUserRole('');
    setUserAccess(resolveUserAccess(null));
    setUsers([]);
    showSuccess('Logged out successfully!');
  };

  useEffect(() => {
    const loadUsers = async () => {
      if (!isLoggedIn || userRole !== 'admin') {
        return;
      }
      try {
        const data = await fetchUsers();
        setUsers(data);
      } catch (error) {
        showError(`Failed to load users: ${error.message}`);
      }
    };

    loadUsers();
  }, [isLoggedIn, userRole]);

  useEffect(() => {
    const loadMinimums = async () => {
      if (!isLoggedIn || userRole !== 'admin') {
        setStockMinimums([]);
        return;
      }
      try {
        const data = await fetchStockMinimums();
        setStockMinimums(data);
      } catch (error) {
        setStockMinimums([]);
        const msg = String(error.message || '').toLowerCase();
        if (!msg.includes('not found')) {
          showError(`Failed to load minimum stock rules: ${error.message}`);
        }
      }
    };
    loadMinimums();
  }, [isLoggedIn, userRole]);

  useEffect(() => {
    if (userRole !== 'admin' && activeTab === 'users') {
      setActiveTab('reelstockmanagement');
    }
  }, [userRole, activeTab]);

  const canAccessReports = canUseReportsNav(userAccess);

  useEffect(() => {
    if (!canAccessReports && activeTab === 'report') {
      setActiveTab('reelstockmanagement');
    }
  }, [canAccessReports, activeTab]);


  if (isAuthChecking) {
    return (
      <>
        <div className="d-flex justify-content-center align-items-center vh-100">Checking session...</div>
        <ToastContainerComponent />
      </>
    );
  }

  if (!isLoggedIn) {
    return (
      <>
        <Login onLogin={handleLogin} />
        <ToastContainerComponent />
      </>
    );
  }

  return (
    <>
      <Layout 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        onLogout={handleLogout}
        onOpenProfile={() => setIsProfileModalOpen(true)}
        userName={userName}
        userRole={userRole}
        canAccessReports={canAccessReports}
      >
        {activeTab === 'reelstockmanagement' ? (
          <ReelStockManagement
            reels={reels}
            stockMinimums={stockMinimums}
            userRole={userRole}
            userName={userName}
            isLoading={isLoadingReels}
            onAddReel={async (newReel) => {
              const created = await createReel(newReel);
              setReels((prev) => [...prev, created]);
            }}
            onBulkAddReels={async (newReels) => {
              const result = await createReelsBulk(newReels);
              if (result.created?.length) {
                setReels((prev) => [...prev, ...result.created]);
              }
              return result;
            }}
            onUpdateReel={async (reel) => {
              const updated = await updateReel(reel.id, reel);
              setReels((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
            }}
            onDeleteReel={async (id) => {
              await deleteReel(id);
              setReels((prev) => prev.filter((item) => item.id !== id));
            }}
            onToggleReel={async (id) => {
              const updated = await toggleReel(id);
              setReels((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
            }}
          />
        ) : activeTab === 'report' ? (
          <Report
            reels={reels}
            stockMinimums={stockMinimums}
            setStockMinimums={setStockMinimums}
            userRole={userRole}
            userAccess={userAccess}
          />
        ) : (
          <UsersManagement users={users} setUsers={setUsers} />
        )}
      </Layout>

      <ProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        userData={{
          username: userName,
          firstName: userName?.split(' ')[0] || '',
          lastName: userName?.split(' ').slice(1).join(' ') || '',
          email: userEmail || 'user@example.com',
          phone: '',
          location: '',
          hours: ''
        }}
        onUpdateProfile={async (profileData) => {
          setUserName(profileData.username || userName);
          setUserEmail(profileData.email || userEmail);
          showSuccess('Profile updated');
        }}
        onChangePassword={async () => {
          showSuccess('Password change is not connected to the server yet');
        }}
      />

      <ToastContainerComponent />
    </>
  );
}

export default App;