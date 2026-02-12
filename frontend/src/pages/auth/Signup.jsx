import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../api/axios';
import logo from '../../assets/bayroot-removebg-preview.png';
import './Signup.css';

/**
 * Signup Page - Matches the design from image
 */
const Signup = () => {
  const [accountType, setAccountType] = useState('partner'); // 'partner' or 'admin'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [companyName, setCompanyName] = useState(''); // For partner
  const [name, setName] = useState(''); // For admin
  const [verificationCode, setVerificationCode] = useState(['', '', '', '']);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  const navigate = useNavigate();

  // Handle verification code input
  const handleCodeChange = (index, value) => {
    if (value.length > 1) return; // Only allow single digit
    
    const newCode = [...verificationCode];
    newCode[index] = value;
    setVerificationCode(newCode);

    // Auto-focus next input
    if (value && index < 3) {
      const nextInput = document.getElementById(`code-${index + 1}`);
      if (nextInput) nextInput.focus();
    }
  };

  // Handle code input key events
  const handleCodeKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !verificationCode[index] && index > 0) {
      const prevInput = document.getElementById(`code-${index - 1}`);
      if (prevInput) prevInput.focus();
    }
  };

  // Send verification code (mock for now)
  const handleSendCode = () => {
    // TODO: Implement actual verification code sending
    alert('Verification code sent to your email!');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // Validation
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    // Check verification code (mock validation for now)
    const code = verificationCode.join('');
    if (code.length !== 4) {
      setError('Please enter the complete verification code');
      return;
    }

    setLoading(true);

    try {
      const endpoint = accountType === 'admin' ? '/admin/register' : '/partner/register';
      const payload = accountType === 'admin' 
        ? { name, email, password }
        : { companyName, email, password };

      const response = await api.post(endpoint, payload);

      if (response.data.success) {
        setSuccess('Account created successfully! Redirecting to login...');
        setTimeout(() => {
          navigate('/login');
        }, 2000);
      } else {
        setError(response.data.message || 'Signup failed');
      }
    } catch (err) {
      const errorMessage = err.response?.data?.message || err.message || 'Signup failed. Please try again.';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="signup-page">
      {/* Left Column - Promotional Section */}
      <div className="signup-left">
        <div className="promo-content">
          <div className="logo-placeholder">
            <img src={logo} alt="Bayroot Logo" className="promo-logo" />
          </div>
          
          <h1 className="promo-headline">
            Your Future<br />
            <span className="promo-headline-accent">Without Borders.</span>
          </h1>
          
          <p className="promo-subtext">
            Step into a world of global opportunities. From world-class education to professional migration, we pave your path to excellence.
          </p>
          
          <div className="city-skyline">
            {/* City skyline graphic - using CSS */}
            <div className="skyline-buildings"></div>
          </div>
          
          <div className="stats-box">
            <div className="stat-item">
              <div className="stat-number">15k+</div>
              <div className="stat-label">SUCCESS STORIES</div>
            </div>
            <div className="stat-item">
              <div className="stat-number">50+</div>
              <div className="stat-label">PARTNER COUNTRIES</div>
            </div>
            <div className="stat-item">
              <div className="stat-icon">✓</div>
              <div className="stat-label">EXPERT ADVICE</div>
            </div>
          </div>
          
          <div className="copyright">
            © 2026 Doabsy Solutions. All rights reserved.
          </div>
        </div>
      </div>

      {/* Right Column - Signup Form */}
      <div className="signup-right">
        <div className="signup-card">
          <div className="signup-header">
            <img src={logo} alt="Bayroot Logo" className="signup-logo" />
          </div>
          
          <h2 className="signup-title">Create Account</h2>
          <p className="signup-subtitle">Join our global community today</p>
          
          {/* Account Type Selector */}
          <div className="account-type-selector">
            <button
              type="button"
              className={`type-btn ${accountType === 'partner' ? 'active' : ''}`}
              onClick={() => setAccountType('partner')}
            >
              Partner Portal
            </button>
            <button
              type="button"
              className={`type-btn ${accountType === 'admin' ? 'active' : ''}`}
              onClick={() => setAccountType('admin')}
            >
              Administrator
            </button>
          </div>

          <form onSubmit={handleSubmit} className="signup-form">
            {/* Company Name (Partner) or Name (Admin) */}
            {accountType === 'partner' ? (
              <div className="form-group">
                <label htmlFor="companyName">Company Name</label>
                <input
                  id="companyName"
                  type="text"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  className="form-input"
                  required
                  placeholder="Enter company name"
                />
              </div>
            ) : (
              <div className="form-group">
                <label htmlFor="name">Full Name</label>
                <input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="form-input"
                  required
                  placeholder="Enter your full name"
                />
              </div>
            )}

            {/* Email */}
            <div className="form-group">
              <label htmlFor="email">Work Email Address</label>
              <div className="input-with-icon">
                <span className="input-icon">@</span>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="form-input"
                  required
                  placeholder="Enter your work email"
                />
              </div>
            </div>

            {/* Password Fields - Side by Side */}
            <div className="password-row">
              <div className="form-group">
                <label htmlFor="password">Password</label>
                <div className="input-with-icon">
                  <span className="input-icon">🔒</span>
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="form-input"
                    required
                    placeholder="Enter password"
                  />
                  <button
                    type="button"
                    className="password-toggle"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    👁
                  </button>
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="confirmPassword">Confirm</label>
                <div className="input-with-icon">
                  <span className="input-icon">✓</span>
                  <input
                    id="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="form-input"
                    required
                    placeholder="Confirm password"
                  />
                </div>
              </div>
            </div>

            {/* Security Check */}
            <div className="security-check">
              <div className="security-header">
                <span className="security-label">SECURITY CHECK</span>
                <button
                  type="button"
                  className="send-code-btn"
                  onClick={handleSendCode}
                >
                  SEND CODE
                </button>
              </div>
              <div className="code-inputs">
                {verificationCode.map((digit, index) => (
                  <input
                    key={index}
                    id={`code-${index}`}
                    type="text"
                    maxLength="1"
                    value={digit}
                    onChange={(e) => handleCodeChange(index, e.target.value)}
                    onKeyDown={(e) => handleCodeKeyDown(index, e)}
                    className="code-input"
                    placeholder="•"
                  />
                ))}
              </div>
            </div>

            {error && <div className="error-message">{error}</div>}
            {success && <div className="success-message">{success}</div>}

            <button
              type="submit"
              className="signup-btn"
              disabled={loading}
            >
              {loading ? 'CREATING ACCOUNT...' : 'SIGN UP NOW →'}
            </button>
          </form>

          <div className="signup-footer">
            <p>
              Already have an account?{' '}
              <Link to="/login" className="signin-link">
                Sign In
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Signup;

