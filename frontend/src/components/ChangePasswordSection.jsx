import { useState, useEffect } from 'react';
import api from '../api/axios';
import './ChangePasswordSection.css';

const ChangePasswordSection = ({ apiBase }) => {
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState(['', '', '', '']);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [sendingOTP, setSendingOTP] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loadingProfile, setLoadingProfile] = useState(true);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await api.get(`${apiBase}/profile`);
        if (res.data.success && res.data.data?.user?.email) {
          setEmail(res.data.data.user.email);
        }
      } catch (err) {
        console.error('Failed to fetch profile:', err);
      } finally {
        setLoadingProfile(false);
      }
    };
    fetchProfile();
  }, [apiBase]);

  const handleOtpChange = (index, value) => {
    if (value && !/^\d$/.test(value)) return;
    if (value.length > 1) return;
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);
    if (value && index < 3) {
      const next = document.getElementById(`otp-${index + 1}`);
      if (next) next.focus();
    }
  };

  const handleOtpKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      const prev = document.getElementById(`otp-${index - 1}`);
      if (prev) prev.focus();
    }
  };

  const handleSendOTP = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (!email) {
      setError('Email is required');
      return;
    }
    setSendingOTP(true);
    try {
      const res = await api.post(`${apiBase}/send-forgot-password-otp`, { email });
      if (res.data.success) {
        setSuccess('Verification code sent to your email. Please check your inbox.');
        setStep(2);
        setOtp(['', '', '', '']);
      } else {
        setError(res.data.message || 'Failed to send verification code');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to send verification code. Please try again.');
    } finally {
      setSendingOTP(false);
    }
  };

  const handleVerifyAndReset = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    const otpCode = otp.join('');
    if (otpCode.length !== 4) {
      setError('Please enter the complete 4-digit verification code');
      return;
    }
    if (!newPassword || newPassword.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    setLoading(true);
    try {
      const res = await api.post(`${apiBase}/reset-password`, {
        email,
        otp: otpCode,
        newPassword
      });
      if (res.data.success) {
        setSuccess('Password changed successfully! You can now use your new password to login.');
        setStep(1);
        setOtp(['', '', '', '']);
        setNewPassword('');
        setConfirmPassword('');
      } else {
        setError(res.data.message || 'Failed to reset password');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid or expired code. Please request a new one.');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setStep(1);
    setOtp(['', '', '', '']);
    setNewPassword('');
    setConfirmPassword('');
    setError('');
    setSuccess('');
  };

  if (loadingProfile) {
    return (
      <div className="change-password-section">
        <h3 className="change-password-title">Change / Forgot Password</h3>
        <p className="change-password-loading">Loading...</p>
      </div>
    );
  }

  return (
    <div className="change-password-section">
      <h3 className="change-password-title">Change / Forgot Password</h3>
      <p className="change-password-desc">
        Use email verification to securely change your password. A 4-digit code will be sent to your email.
      </p>

      {step === 1 && (
        <form onSubmit={handleSendOTP} className="change-password-form">
          <div className="form-group">
            <label htmlFor="cp-email">Email Address</label>
            <input
              id="cp-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="form-input"
              required
              placeholder="your@email.com"
            />
          </div>
          {error && <div className="change-password-error">{error}</div>}
          {success && <div className="change-password-success">{success}</div>}
          <button type="submit" className="btn-send-otp" disabled={sendingOTP}>
            {sendingOTP ? 'Sending...' : 'Send Verification Code'}
          </button>
        </form>
      )}

      {step === 2 && (
        <form onSubmit={handleVerifyAndReset} className="change-password-form">
          <div className="form-group">
            <label>Verification Code</label>
            <div className="otp-inputs">
              {otp.map((digit, i) => (
                <input
                  key={i}
                  id={`otp-${i}`}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleOtpChange(i, e.target.value)}
                  onKeyDown={(e) => handleOtpKeyDown(i, e)}
                  className="otp-input"
                  placeholder="•"
                />
              ))}
            </div>
          </div>
          <div className="form-group">
            <label htmlFor="cp-new">New Password</label>
            <input
              id="cp-new"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="form-input"
              placeholder="Min 6 characters"
              minLength={6}
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="cp-confirm">Confirm New Password</label>
            <input
              id="cp-confirm"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="form-input"
              placeholder="Repeat password"
              minLength={6}
              required
            />
          </div>
          {error && <div className="change-password-error">{error}</div>}
          {success && <div className="change-password-success">{success}</div>}
          <div className="change-password-actions">
            <button type="button" className="btn-cancel" onClick={handleCancel}>
              Cancel
            </button>
            <button type="submit" className="btn-reset" disabled={loading}>
              {loading ? 'Updating...' : 'Update Password'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
};

export default ChangePasswordSection;
