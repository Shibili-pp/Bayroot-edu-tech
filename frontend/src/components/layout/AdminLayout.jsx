import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';

/**
 * Admin Layout - Layout for admin pages
 */
const AdminLayout = ({ children }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="admin-layout">
      <header className="layout-header">
        <div className="header-content">
          <h2>Bayroot Edu Tech - Admin</h2>
          <div className="header-actions">
            <span className="user-info">Welcome, {user?.id || 'Admin'}</span>
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
                <a href="/admin/dashboard">Dashboard</a>
              </li>
              {/* Add more admin navigation items here */}
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

export default AdminLayout;

