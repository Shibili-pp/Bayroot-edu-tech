import { useAuth } from '../../context/AuthContext';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import logo from '../../assets/EDU CONNECT.png';
import NewAnnouncementModal from '../NewAnnouncementModal';
import NotificationsPopup from '../NotificationsPopup';
import api from '../../api/axios';
import { getSocket, onUnreadCountUpdate } from '../../services/socket.service';
import './AdminLayout.css';

/**
 * Admin Layout - Layout for admin pages with sidebar navigation
 */
const AdminLayout = ({ children }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isAnnouncementModalOpen, setIsAnnouncementModalOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const isActive = (path) => {
    return location.pathname === path;
  };

  const menuItems = [
    { 
      path: '/admin/dashboard', 
      label: 'Dashboard', 
      icon: (
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
          <path d="M2.25 4.5H7.5V13.5H2.25V4.5ZM10.5 2.25H15.75V13.5H10.5V2.25ZM2.25 15.75H15.75V16.5H2.25V15.75Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      )
    },
    { 
      path: '/admin/applications', 
      label: 'Applications', 
      icon: (
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
          <path d="M3 4.5H15M3 9H15M3 13.5H12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      )
    },
    { 
      path: '/admin/documents', 
      label: 'Documents', 
      icon: (
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
          <path d="M4.5 2.25H10.5L13.5 5.25V15.75C13.5 16.1642 13.1642 16.5 12.75 16.5H5.25C4.83579 16.5 4.5 16.1642 4.5 15.75V2.25Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M10.5 2.25V5.25H13.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      )
    },
    { 
      path: '/admin/consultancies', 
      label: 'Partners', 
      icon: (
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
          <path d="M9 9C11.0711 9 12.75 7.32107 12.75 5.25C12.75 3.17893 11.0711 1.5 9 1.5C6.92893 1.5 5.25 3.17893 5.25 5.25C5.25 7.32107 6.92893 9 9 9Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M3.75 16.5C3.75 13.5975 6.1425 11.25 9 11.25C11.8575 11.25 14.25 13.5975 14.25 16.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      )
    },
    { 
      path: '/admin/reports', 
      label: 'Reports', 
      icon: (
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
          <path d="M3 13.5V15.75H15V13.5M3 13.5L6 9.75L9 12.75L12.75 8.25L15 10.5M3 13.5H15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M3 2.25H15V4.5H3V2.25Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      )
    },
    { 
      path: '/admin/universities', 
      label: 'Universities', 
      icon: (
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
          <path d="M9 2.25L11.25 8.25L17.25 9L11.25 9.75L9 15.75L6.75 9.75L0.75 9L6.75 8.25L9 2.25Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      )
    },
    { 
      path: '/admin/countries', 
      label: 'Countries', 
      icon: (
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
          <path d="M9 1.5C4.85786 1.5 1.5 4.85786 1.5 9C1.5 13.1421 4.85786 16.5 9 16.5C13.1421 16.5 16.5 13.1421 16.5 9C16.5 4.85786 13.1421 1.5 9 1.5Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M9 1.5V16.5M1.5 9H16.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      )
    },
    { 
      path: '/admin/courses', 
      label: 'Courses', 
      icon: (
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
          <path d="M3 2.25H15C15.4142 2.25 15.75 2.58579 15.75 3V15C15.75 15.4142 15.4142 15.75 15 15.75H3C2.58579 15.75 2.25 15.4142 2.25 15V3C2.25 2.58579 2.58579 2.25 3 2.25Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M6 5.25H12M6 9H12M6 12.75H9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      )
    },
    { 
      path: '/admin/intakes', 
      label: 'Intakes', 
      icon: (
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
          <path d="M3 2.25H15C15.4142 2.25 15.75 2.58579 15.75 3V15C15.75 15.4142 15.4142 15.75 15 15.75H3C2.58579 15.75 2.25 15.4142 2.25 15V3C2.25 2.58579 2.58579 2.25 3 2.25Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M3 6.75H15M6.75 2.25V6.75M11.25 2.25V6.75" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      )
    },
    { 
      path: '/admin/announcements', 
      label: 'Announcements', 
      icon: (
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
          <path d="M9 2.25C6.92893 2.25 5.25 3.92893 5.25 6V9.75L3.75 12.75H14.25L12.75 9.75V6C12.75 3.92893 11.0711 2.25 9 2.25Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M6.75 15.75C6.75 16.5784 7.42157 17.25 8.25 17.25H9.75C10.5784 17.25 11.25 16.5784 11.25 15.75" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      )
    },
    { 
      path: '/admin/update-timeline', 
      label: 'Update Timeline', 
      icon: (
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
          <path d="M9 3V15M3 9H15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          <path d="M9 1.5C4.85786 1.5 1.5 4.85786 1.5 9C1.5 13.1421 4.85786 16.5 9 16.5C13.1421 16.5 16.5 13.1421 16.5 9C16.5 4.85786 13.1421 1.5 9 1.5Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      )
    },
    { 
      path: '/admin/settings', 
      label: 'Settings', 
      icon: (
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
          <path d="M9 11.25C10.2426 11.25 11.25 10.2426 11.25 9C11.25 7.75736 10.2426 6.75 9 6.75C7.75736 6.75 6.75 7.75736 6.75 9C6.75 10.2426 7.75736 11.25 9 11.25Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M14.0625 7.5C13.95 7.1925 13.8075 6.9 13.635 6.6225L15.0975 5.16C15.2475 5.01 15.2475 4.77 15.0975 4.62L13.38 2.9025C13.23 2.7525 12.99 2.7525 12.84 2.9025L11.3775 4.365C11.1 4.1925 10.8075 4.05 10.5 3.9375V2.25C10.5 2.03579 10.3142 1.875 10.125 1.875H7.875C7.68579 1.875 7.5 2.03579 7.5 2.25V3.9375C7.1925 4.05 6.9 4.1925 6.6225 4.365L5.16 2.9025C5.01 2.7525 4.77 2.7525 4.62 2.9025L2.9025 4.62C2.7525 4.77 2.7525 5.01 2.9025 5.16L4.365 6.6225C4.1925 6.9 4.05 7.1925 3.9375 7.5H2.25C2.03579 7.5 1.875 7.68579 1.875 7.875V10.125C1.875 10.3142 2.03579 10.5 2.25 10.5H3.9375C4.05 10.8075 4.1925 11.1 4.365 11.3775L2.9025 12.84C2.7525 12.99 2.7525 13.23 2.9025 13.38L4.62 15.0975C4.77 15.2475 5.01 15.2475 5.16 15.0975L6.6225 13.635C6.9 13.8075 7.1925 13.95 7.5 14.0625V15.75C7.5 15.9642 7.68579 16.125 7.875 16.125H10.125C10.3142 16.125 10.5 15.9642 10.5 15.75V14.0625C10.8075 13.95 11.1 13.8075 11.3775 13.635L12.84 15.0975C12.99 15.2475 13.23 15.2475 13.38 15.0975L15.0975 13.38C15.2475 13.23 15.2475 12.99 15.0975 12.84L13.635 11.3775C13.8075 11.1 13.95 10.8075 14.0625 10.5H15.75C15.9642 10.5 16.125 10.3142 16.125 10.125V7.875C16.125 7.68579 15.9642 7.5 15.75 7.5H14.0625Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      )
    },
  ];

  // ARCHITECTURE IMPROVEMENT: WebSocket-based real-time unread count updates
  // Replaces polling-based system with efficient WebSocket events
  useEffect(() => {
    // Initial fetch on mount (fallback if WebSocket not ready)
    const fetchInitialCount = async () => {
      try {
        const response = await api.get('/comments/unread/partner?limit=100', {
          cacheTTL: 30000
        });
        if (response.data.success) {
          setUnreadCount(response.data.data?.comments?.length || 0);
        }
      } catch (error) {
        if (error.response?.status !== 429) {
          console.error('Error fetching initial unread count:', error);
        }
      }
    };

    fetchInitialCount();

    // ARCHITECTURE: Listen to WebSocket events for real-time updates
    // This eliminates the need for polling intervals
    const socket = getSocket();
    if (socket && socket.connected) {
      // Set up WebSocket listener for unread count updates
      const cleanup = onUnreadCountUpdate((count, timestamp) => {
        console.log('Socket.IO: Received unread count update:', count);
        setUnreadCount(count);
      });

      // Cleanup listener on unmount
      return cleanup;
    } else {
      // Fallback: If WebSocket not connected, use polling (backward compatibility)
      console.warn('Socket.IO not connected, falling back to polling');
      const interval = setInterval(fetchInitialCount, 60000);
      return () => clearInterval(interval);
    }
  }, [isNotificationsOpen]);

  // Get user initials for avatar
  const getUserInitials = () => {
    if (user?.name) {
      const names = user.name.split(' ');
      if (names.length >= 2) {
        return (names[0][0] + names[1][0]).toUpperCase();
      }
      return user.name.charAt(0).toUpperCase();
    }
    return 'A';
  };

  return (
    <div className="admin-layout">
      {/* Left Sidebar */}
      <aside className={`layout-sidebar ${sidebarOpen ? 'open' : ''}`}>
        {/* Logo Section */}
        <div className="sidebar-header">
          <Link to="/admin/dashboard" className="logo-container">
            <img src={logo} alt="Bayroot Logo" className="sidebar-logo" />
          </Link>
        </div>

        {/* Navigation Menu */}
        <nav className="sidebar-nav">
          {menuItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`nav-item ${isActive(item.path) ? 'active' : ''}`}
              onClick={() => setSidebarOpen(false)}
            >
              <span className="nav-icon">{item.icon}</span>
              <span className="nav-label">{item.label}</span>
            </Link>
          ))}
        </nav>

        {/* User Profile Section */}
        <div className="sidebar-footer">
          <div className="user-profile">
            <div className="user-avatar">
              {getUserInitials()}
            </div>
            <div className="user-info">
              <div className="user-name">{user?.name || 'Admin'}</div>
              <div className="user-role">Senior Admin</div>
            </div>
          </div>
          <button 
            className="logout-button"
            onClick={handleLogout}
            aria-label="Logout"
          >
            <span className="nav-icon">
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <path d="M6.75 15.75H3.75C3.33579 15.75 3 15.4142 3 15V3C3 2.58579 3.33579 2.25 3.75 2.25H6.75M12.75 12.75L15.75 9.75M15.75 9.75L12.75 6.75M15.75 9.75H6.75" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </span>
            <span className="nav-label">Logout</span>
          </button>
        </div>
      </aside>

      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div 
          className="sidebar-overlay"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main Content Area */}
      <div className="layout-main-wrapper">
        {/* Top Header */}
        <header className="layout-header">
          <button 
            className="mobile-menu-toggle"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            aria-label="Toggle menu"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M2.5 5H17.5M2.5 10H17.5M2.5 15H17.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </button>
          
          <Link to="/admin/dashboard" className="header-logo-mobile">
            <img src={logo} alt="Bayroot Logo" className="header-logo-img" />
          </Link>

          <div className="header-search">
            <svg className="search-icon" width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M7.33333 12.6667C10.2789 12.6667 12.6667 10.2789 12.6667 7.33333C12.6667 4.38781 10.2789 2 7.33333 2C4.38781 2 2 4.38781 2 7.33333C2 10.2789 4.38781 12.6667 7.33333 12.6667Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M14 14L11.1 11.1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <input
              type="text"
              placeholder="Search applications, documents or students..."
              className="search-input"
            />
          </div>
          <div className="header-actions">
            <button 
              className="header-icon-btn notification-btn" 
              aria-label="Notifications"
              onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
            >
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M10 2C7.23858 2 5 4.23858 5 7V10.5858L3.29289 12.2929C3.10536 12.4804 3 12.7348 3 13V15C3 15.5523 3.44772 16 4 16H16C16.5523 16 17 15.5523 17 15V13C17 12.7348 16.8946 12.4804 16.7071 12.2929L15 10.5858V7C15 4.23858 12.7614 2 10 2Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M8 16V17C8 18.1046 8.89543 19 10 19C11.1046 19 12 18.1046 12 17V16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              {unreadCount > 0 && (
                <span className="notification-badge">{unreadCount > 99 ? '99+' : unreadCount}</span>
              )}
            </button>
            <button 
              className="btn-new-application"
              onClick={() => setIsAnnouncementModalOpen(true)}
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ marginRight: '6px' }}>
                <path d="M8 3V13M3 8H13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
              New Announcement
            </button>
          </div>
        </header>

        {/* Main Content */}
        <main className="layout-main">
          {children}
        </main>
      </div>

      {/* New Announcement Modal */}
      <NewAnnouncementModal
        isOpen={isAnnouncementModalOpen}
        onClose={() => setIsAnnouncementModalOpen(false)}
        onSuccess={(announcement) => {
          setIsAnnouncementModalOpen(false);
        }}
      />

      {/* Notifications Popup */}
      <NotificationsPopup
        isOpen={isNotificationsOpen}
        onClose={() => {
          setIsNotificationsOpen(false);
          // REFACTORED: Use caching when refreshing count after popup closes
          // This prevents unnecessary API calls and reduces rate limiting risk
          setTimeout(() => {
            api.get('/comments/unread/partner?limit=100', { cacheTTL: 30000 })
              .then(response => {
                if (response.data.success) {
                  setUnreadCount(response.data.data?.comments?.length || 0);
                }
              })
              .catch(() => {
                // Silently fail - don't reset count on error to avoid UI flickering
              });
          }, 500);
        }}
      />
    </div>
  );
};

export default AdminLayout;
