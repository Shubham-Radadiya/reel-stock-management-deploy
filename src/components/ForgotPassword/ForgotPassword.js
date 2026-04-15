import React, { useState } from 'react';
import { Mail, ArrowLeft, Send, KeyRound, CheckCircle, Lock, Eye, EyeOff } from 'lucide-react';
import './ForgotPassword.css';

const ForgotPassword = ({ onBack, onPasswordReset }) => {
  const [step, setStep] = useState('email'); // email, otp, reset
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [sentOtp, setSentOtp] = useState('');

  const handleSendOTP = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');
    
    setTimeout(() => {
      if (email && email.includes('@')) {
        const mockOtp = Math.floor(100000 + Math.random() * 900000).toString();
        setSentOtp(mockOtp);
        console.log('OTP sent:', mockOtp);
        setSuccess('OTP sent to your email!');
        setStep('otp');
      } else {
        setError('Please enter a valid email address');
      }
      setLoading(false);
    }, 1000);
  };

  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');
    
    setTimeout(() => {
      if (otp === sentOtp) {
        setSuccess('OTP verified successfully!');
        setStep('reset');
      } else {
        setError('Invalid OTP. Please try again.');
      }
      setLoading(false);
    }, 500);
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');
    
    setTimeout(() => {
      if (newPassword.length < 6) {
        setError('Password must be at least 6 characters');
      } else if (newPassword !== confirmPassword) {
        setError('Passwords do not match');
      } else {
        setSuccess('Password reset successfully!');
        setTimeout(() => {
          onPasswordReset(email, newPassword);
          onBack();
        }, 1500);
      }
      setLoading(false);
    }, 500);
  };

  return (
    <div className="fp-forgot-wrapper">
      <div className="fp-forgot-card">
        <button className="fp-back-btn" onClick={onBack}>
          <ArrowLeft size={20} />
        </button>

        <div className="fp-text-center">
          <div className="fp-icon-wrapper">
            {step === 'email' && <Mail size={32} />}
            {step === 'otp' && <KeyRound size={32} />}
            {step === 'reset' && <CheckCircle size={32} />}
          </div>
          <h2 className="fp-title">
            {step === 'email' && 'Forgot Password?'}
            {step === 'otp' && 'Verify OTP'}
            {step === 'reset' && 'Set New Password'}
          </h2>
          <p className="fp-subtitle">
            {step === 'email' && 'Enter your email to receive OTP'}
            {step === 'otp' && 'Enter the 6-digit code sent to your email'}
            {step === 'reset' && 'Create a new strong password'}
          </p>
        </div>

        {error && <div className="fp-alert fp-alert-danger">{error}</div>}
        {success && <div className="fp-alert fp-alert-success">{success}</div>}

        {step === 'email' && (
          <form onSubmit={handleSendOTP}>
            <div className="fp-form-group">
              <label className="fp-label">Email Address</label>
              <div className="fp-input-group">
                <span className="fp-input-icon">
                  <Mail size={18} />
                </span>
                <input
                  type="email"
                  className="fp-input"
                  placeholder="Enter your registered email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            <button type="submit" className="fp-submit-btn" disabled={loading}>
              {loading ? 'Sending...' : 'Send OTP'}
            </button>
          </form>
        )}

        {step === 'otp' && (
          <form onSubmit={handleVerifyOTP}>
            <div className="fp-form-group">
              <label className="fp-label">Enter OTP</label>
              <div className="fp-input-group">
                <span className="fp-input-icon">
                  <KeyRound size={18} />
                </span>
                <input
                  type="text"
                  className="fp-input fp-otp-input"
                  placeholder="Enter 6-digit OTP"
                  maxLength="6"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                  required
                />
              </div>
              <small className="fp-demo-hint">
                Demo OTP: <strong>{sentOtp}</strong> (Check console)
              </small>
            </div>

            <button type="button" className="fp-resend-btn" onClick={handleSendOTP}>
              Resend OTP
            </button>

            <button type="submit" className="fp-submit-btn" disabled={loading}>
              {loading ? 'Verifying...' : 'Verify OTP'}
            </button>
          </form>
        )}

        {step === 'reset' && (
          <form onSubmit={handleResetPassword}>
            <div className="fp-form-group">
              <label className="fp-label">New Password</label>
              <div className="fp-input-group">
                <span className="fp-input-icon">
                  <Lock size={18} />
                </span>
                <input
                  type={showPassword ? "text" : "password"}
                  className="fp-input"
                  placeholder="Enter new password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="fp-form-group">
              <label className="fp-label">Confirm Password</label>
              <div className="fp-input-group">
                <span className="fp-input-icon">
                  <Lock size={18} />
                </span>
                <input
                  type={showPassword ? "text" : "password"}
                  className="fp-input"
                  placeholder="Confirm new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="fp-checkbox-group">
              <input
                type="checkbox"
                id="fpShowPassword"
                checked={showPassword}
                onChange={() => setShowPassword(!showPassword)}
              />
              <label htmlFor="fpShowPassword">Show passwords</label>
            </div>

            <button type="submit" className="fp-submit-btn" disabled={loading}>
              {loading ? 'Resetting...' : 'Reset Password'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default ForgotPassword;