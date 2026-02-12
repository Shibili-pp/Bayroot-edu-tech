import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';

/**
 * Partner Layout - Layout for partner pages
 */
const PartnerLayout = ({ children }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="partner-layout">
      <header className="layout-header">
        <div className="header-content">
          <h2>Bayroot Edu Tech - Partner</h2>
          <div className="header-actions">
            <span className="user-info">
              {user?.companyName || 'Partner'}
            </span>
            <button onClick={handleLogout} className="btn-logout">
              Logout
            </button>
          </div>
        </div>
      </header>
      
      <div className="layout-body">
        <aside className="layout-sidebar">
          <nav className="sidebar-nav">
            <ul>
              <li>
                <a href="/partner/dashboard">Dashboard</a>
              </li>
              {/* Add more partner navigation items here */}
            </ul>
          </nav>
        </aside>
        
        <main className="layout-main">
          {children}
        </main>
      </div>
    </div>
  );
};

export default PartnerLayout;

