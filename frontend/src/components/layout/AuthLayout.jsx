/**
 * Auth Layout - Simple layout for login/register pages
 */
const AuthLayout = ({ children }) => {
  return (
    <div className="auth-layout">
      <div className="auth-container">
        <div className="auth-header">
          <h1>Bayroot Edu Tech</h1>
          <p>B2B Education Platform</p>
        </div>
        <div className="auth-content">
          {children}
        </div>
      </div>
    </div>
  );
};

export default AuthLayout;




