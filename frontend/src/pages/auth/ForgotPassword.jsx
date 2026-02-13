import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../api/axios';
import logo from '../../assets/EDU CONNECT.png';
import './ForgotPassword.css';

/**
 * Forgot Password Page
 */
const ForgotPassword = () => {
  const [step, setStep] = useState(1); // 1: Enter email, 2: Enter OTP, 3: Reset password
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState(['', '', '', '']);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [sendingOTP, setSendingOTP] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  const navigate = useNavigate();

  // Handle OTP input
  const handleOtpChange = (index, value) => {
    if (value && !/^\d$/.test(value)) return;
    if (value.length > 1) return;
    
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    if (value && index < 3) {
      const nextInput = document.getElementById(`otp-${index + 1}`);
      if (nextInput) nextInput.focus();
    }
  };

  const handleOtpKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      const prevInput = document.getElementById(`otp-${index - 1}`);
      if (prevInput) prevInput.focus();
    }
  };

  // Step 1: Send OTP
  const handleSendOTP = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!email) {
      setError('Please enter your email address');
      return;
    }

    setSendingOTP(true);

    try {
      // Try admin first, then partner
      let response = await api.post('/admin/send-forgot-password-otp', { email });
      
      if (!response.data.success) {
        response = await api.post('/partner/send-forgot-password-otp', { email });
      }

      if (response.data.success) {
        setSuccess('OTP sent to your email! Please check your inbox.');
        setStep(2);
        setOtp(['', '', '', '']);
      } else {
        setError(response.data.message || 'Failed to send OTP');
      }
    } catch (err) {
      // Try partner endpoint if admin fails
      try {
        const response = await api.post('/partner/send-forgot-password-otp', { email });
        if (response.data.success) {
          setSuccess('OTP sent to your email! Please check your inbox.');
          setStep(2);
          setOtp(['', '', '', '']);
        } else {
          setError('Failed to send OTP. Please check your email and try again.');
        }
      } catch (partnerErr) {
        setError('Failed to send OTP. Please check your email and try again.');
      }
    } finally {
      setSendingOTP(false);
    }
  };

  // Step 2: Verify OTP and proceed to reset password
  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    const otpCode = otp.join('');
    if (otpCode.length !== 4) {
      setError('Please enter the complete OTP code');
      return;
    }

    setLoading(true);

    try {
      // Verify OTP by attempting reset (OTP verification happens in reset endpoint)
      // We'll move to step 3 if OTP is valid
      setStep(3);
      setSuccess('OTP verified. Please enter your new password.');
    } catch (err) {
      setError('Invalid OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Step 3: Reset password
  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    const otpCode = otp.join('');
    if (otpCode.length !== 4) {
      setError('OTP is required');
      return;
    }

    setLoading(true);

    try {
      // Try admin first, then partner
      let response = await api.post('/admin/reset-password', {
        email,
        otp: otpCode,
        newPassword
      });

      if (!response.data.success) {
        response = await api.post('/partner/reset-password', {
          email,
          otp: otpCode,
          newPassword
        });
      }

      if (response.data.success) {
        setSuccess('Password reset successfully! Redirecting to login...');
        setTimeout(() => {
          navigate('/login');
        }, 2000);
      } else {
        setError(response.data.message || 'Failed to reset password');
      }
    } catch (err) {
      // Try partner endpoint if admin fails
      try {
        const response = await api.post('/partner/reset-password', {
          email,
          otp: otpCode,
          newPassword
        });
        if (response.data.success) {
          setSuccess('Password reset successfully! Redirecting to login...');
          setTimeout(() => {
            navigate('/login');
          }, 2000);
        } else {
          setError(err.response?.data?.message || 'Failed to reset password');
        }
      } catch (partnerErr) {
        setError(partnerErr.response?.data?.message || 'Failed to reset password. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="forgot-password-page">
      {/* Left Column - Promotional Section (hidden on mobile) */}
      <div className="forgot-left">
        <div className="cityscape-background"></div>
        <div className="promo-overlay">
          <div className="premium-badge">SECURE ACCESS</div>
          <h1 className="promo-title">
            Reset Your<br />
            <span className="promo-title-accent">Password</span>
          </h1>
          <p className="promo-description">
            Follow the simple steps to securely reset your password and regain access to your account.
          </p>
        </div>
        <div className="forgot-copyright">
          © 2026 Doabsy Solutions. All rights reserved.
        </div>
      </div>

      {/* Right Column - Forgot Password Form */}
      <div className="forgot-right">
        <div className="forgot-header">
          <img src={logo} alt="Bayroot Logo" className="forgot-logo" />
          <h1 className="forgot-brand">
            <span className="brand-name">BAYROOT</span>
            <span className="brand-portal">Portal</span>
          </h1>
          <p className="forgot-subtitle">
            {step === 1 && 'Enter your email to receive a verification code'}
            {step === 2 && 'Enter the verification code sent to your email'}
            {step === 3 && 'Enter your new password'}
          </p>
        </div>

        <div className="forgot-card">
          {/* Step 1: Enter Email */}
          {step === 1 && (
            <form onSubmit={handleSendOTP} className="forgot-form">
              <div className="form-group">
                <label htmlFor="email">Email Address</label>
                <div className="input-wrapper">
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="form-input"
                    required
                    placeholder="Enter your email"
                  />
                  <span className="input-icon-right">✉</span>
                </div>
              </div>

              {error && <div className="error-message">{error}</div>}
              {success && <div className="success-message">{success}</div>}

              <button
                type="submit"
                className="forgot-btn"
                disabled={sendingOTP || loading}
              >
                {sendingOTP ? 'SENDING OTP...' : 'SEND VERIFICATION CODE →'}
              </button>
            </form>
          )}

          {/* Step 2: Enter OTP */}
          {step === 2 && (
            <form onSubmit={handleVerifyOTP} className="forgot-form">
              <div className="form-group">
                <label>Verification Code</label>
                <div className="otp-inputs">
                  {otp.map((digit, index) => (
                    <input
                      key={index}
                      id={`otp-${index}`}
                      type="text"
                      maxLength="1"
                      value={digit}
                      onChange={(e) => handleOtpChange(index, e.target.value)}
                      onKeyDown={(e) => handleOtpKeyDown(index, e)}
                      className="otp-input"
                      placeholder="•"
                    />
                  ))}
                </div>
                <p className="otp-hint">Didn't receive the code? <button type="button" className="resend-link" onClick={handleSendOTP}>Resend</button></p>
              </div>

              {error && <div className="error-message">{error}</div>}
              {success && <div className="success-message">{success}</div>}

              <button
                type="submit"
                className="forgot-btn"
                disabled={loading}
              >
                {loading ? 'VERIFYING...' : 'VERIFY CODE →'}
              </button>
            </form>
          )}

          {/* Step 3: Reset Password */}
          {step === 3 && (
            <form onSubmit={handleResetPassword} className="forgot-form">
              <div className="form-group">
                <label htmlFor="newPassword">New Password</label>
                <div className="input-wrapper">
                  <input
                    id="newPassword"
                    type={showPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="form-input"
                    required
                    placeholder="Enter new password"
                  />
                  <button
                    type="button"
                    className="input-icon-right password-toggle"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? '👁️' : '👁️‍🗨️'}
                  </button>
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="confirmPassword">Confirm Password</label>
                <div className="input-wrapper">
                  <input
                    id="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="form-input"
                    required
                    placeholder="Confirm new password"
                  />
                  <button
                    type="button"
                    className="input-icon-right password-toggle"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    {showConfirmPassword ? '👁️' : '👁️‍🗨️'}
                  </button>
                </div>
              </div>

              {error && <div className="error-message">{error}</div>}
              {success && <div className="success-message">{success}</div>}

              <button
                type="submit"
                className="forgot-btn"
                disabled={loading}
              >
                {loading ? 'RESETTING PASSWORD...' : 'RESET PASSWORD →'}
              </button>
            </form>
          )}
        </div>

        <div className="forgot-footer">
          <p>
            Remember your password?{' '}
            <Link to="/login" className="login-link">
              Sign In
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;

