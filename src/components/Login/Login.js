import React, { useState } from 'react';
import { Lock, User, Eye, EyeOff } from 'lucide-react';
import ForgotPassword from '../ForgotPassword/ForgotPassword';
import LoginAbout from './LoginAbout';
import './Login.css';
import { showError } from '../../utils/toastUtils';

const Login = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await onLogin(username, password);
    } catch (error) {
      showError(error.message || 'Invalid credentials');
    }
  };

  if (showForgotPassword) {
    return (
      <ForgotPassword 
        onBack={() => setShowForgotPassword(false)}
        onPasswordReset={() => {
          showError('Password reset is not connected to backend yet.');
        }}
      />
    );
  }

  return (
    <div className="login-wrapper">
      <LoginAbout />
      <div className="login-card">
        <div className="text-center mb-4">
          <div className="login-icon-circle">
            <Lock size={32} />
          </div>
          <h2 className="login-title">Welcome</h2>
          <p className="login-subtitle">PINEXA · Reel Stock Management</p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="login-form-group">
            <label className="login-label">Username</label>
            <div className="login-input-group">
              <span className="login-input-icon">
                <User size={18} />
              </span>
              <input 
                type="text" 
                className="login-input" 
                placeholder="Enter username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="login-form-group">
            <label className="login-label">Password</label>
            <div className="login-input-group">
              <span className="login-input-icon">
                <Lock size={18} />
              </span>
              <input 
                type={showPassword ? "text" : "password"} 
                className="login-input" 
                placeholder="Enter password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <button 
                type="button"
                className="login-password-toggle"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <div className="login-forgot-link">
            <button 
              type="button"
              onClick={() => setShowForgotPassword(true)}
            >
              Forgot Password?
            </button>
          </div>

          <button type="submit" className="login-submit-btn">
            Sign In
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;