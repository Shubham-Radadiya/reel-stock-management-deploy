import React, { useState } from 'react';
import Login from './components/Login/Login';
import Layout from './components/Layout/Layout';
import ReelStockManagement from './components/ReelStockManagement/ReelStockManagement';
import Report from './components/Report/Report';
import ProfileModal from './components/Header/ProfileModal/ProfileModal';
import ToastContainerComponent from './components/ToastContainer';
import { initialReels } from './data/mockData';
import { showSuccess} from './utils/toastUtils';
import './App.css';
import 'bootstrap/dist/css/bootstrap.min.css';

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userName, setUserName] = useState('');
  const [activeTab, setActiveTab] = useState('reelstockmanagement');
  const [reels, setReels] = useState(initialReels);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  

  const handleLogin = (user) => {
    setUserName(user);
    setIsLoggedIn(true);
    showSuccess(`Welcome back, ${user}!`);
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setUserName('');
    showSuccess('Logged out successfully!');
  };


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
      >
        {activeTab === 'reelstockmanagement' ? (
          <ReelStockManagement reels={reels} setReels={setReels} />
        ) : (
          <Report reels={reels} />
        )}
      </Layout>

      <ProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
      />

      <ToastContainerComponent />
    </>
  );
}

export default App;