import Header from '../Header/Header';
import './Layout.css';

const Layout = ({ activeTab, setActiveTab, onLogout, onOpenProfile, userName, children }) => {
  return (
    <div className="app-container">
      <Header 
        userName={userName}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onLogout={onLogout}
        onOpenProfile={onOpenProfile}
      />

      {/* Main Content Area */}
      <main className="main-content">
        <div className="page-wrapper">
          {children}
        </div>
      </main>
    </div>
  );
};

export default Layout;