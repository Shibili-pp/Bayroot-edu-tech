import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import logo from '../../assets/bayroot-removebg-preview.png';
import './Login.css';

/**
 * Login Page - Redesigned to match the image
 */
const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Try admin login first, then partner if admin fails
      let result = await login(email, password, 'admin');
      
      if (!result.success) {
        // If admin login fails, try partner login
        result = await login(email, password, 'partner');
      }
      
      if (result.success) {
        // Redirect based on role
        if (result.user.role === 'ADMIN') {
          navigate('/admin/dashboard');
        } else if (result.user.role === 'PARTNER') {
          navigate('/partner/dashboard');
        } else {
          navigate('/login');
        }
      } else {
        setError(result.error || 'Login failed');
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      {/* Left Column - Promotional Section */}
      <div className="login-left">
        <div className="cityscape-background"></div>
        <div className="promo-overlay">
          <div className="premium-badge">PREMIUM CONSULTANCY</div>
          <h1 className="promo-title">
            Your Gateway to<br />
            <span className="promo-title-accent">Global Success.</span>
          </h1>
          <p className="promo-description">
            Empowering students and professionals to reach their international goals through expert migration and study guidance.
          </p>
          <div className="professionals-stats">
            <div className="stats-icons">
              <div className="stat-icon-circle">👤</div>
              <div className="stat-icon-circle">💼</div>
              <div className="stat-icon-circle">📄</div>
            </div>
            <span className="stats-text">Joined by 10k+ professionals worldwide</span>
          </div>
        </div>
        <div className="login-copyright">
          © 2026 Doabsy Solutions. All rights reserved.
        </div>
      </div>

      {/* Right Column - Login Form */}
      <div className="login-right">
        <div className="login-header">
          <img src={logo} alt="Bayroot Logo" className="login-page-logo" />
          <h1 className="login-brand">
            <span className="brand-name">BAYROOT</span>
            <span className="brand-portal">Portal</span>
          </h1>
          <p className="welcome-message">Welcome back! Please enter your details.</p>
        </div>

        <div className="login-card">
          <form onSubmit={handleSubmit} className="login-form">
            {/* Email Input */}
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

            {/* Password Input */}
            <div className="form-group">
              <label htmlFor="password">Password</label>
              <div className="input-wrapper">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="form-input"
                  required
                  placeholder="Enter your password"
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

            {/* Remember Me & Forgot Password */}
            <div className="form-options">
              <label className="remember-me">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                />
                <span>Remember me</span>
              </label>
              <Link to="#" className="forgot-password">
                Forgot Password?
              </Link>
            </div>

            {error && <div className="error-message">{error}</div>}

            {/* Login Button */}
            <button
              type="submit"
              className="login-btn"
              disabled={loading}
            >
              {loading ? 'Logging in...' : 'Log In to Portal'}
              <span className="btn-arrow">→</span>
            </button>

            {/* Secure Access Separator */}
            <div className="secure-separator">
              <div className="separator-line"></div>
              <span className="separator-text">SECURE ACCESS</span>
              <div className="separator-line"></div>
            </div>
          </form>
        </div>

        {/* Sign Up Link */}
        <div className="signup-prompt">
          <p>
            Don't have an account?{' '}
            <Link to="/signup" className="signup-link">
              Sign Up Now
            </Link>
          </p>
        </div>

        {/* Footer Links */}
        <div className="login-footer-links">
          <Link to="#" className="footer-link">Help Center</Link>
          <span className="footer-separator">•</span>
          <Link to="#" className="footer-link">Terms of Service</Link>
          <span className="footer-separator">•</span>
          <Link to="#" className="footer-link">Privacy Policy</Link>
        </div>
      </div>
    </div>
  );
};

export default Login;
