import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import AdminLayout from '../../components/layout/AdminLayout';
import api from '../../api/axios';
import './Dashboard.css';

/**
 * Admin Dashboard Page - Using Real Data
 */
const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalApplications: 0,
    offerLetterProcess: 0,
    applicationProcessing: 0,
    visaProcess: 0,
    studentFileCompleted: 0,
    studentDropped: 0
  });
  const [recentApplications, setRecentApplications] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleteConfirm, setDeleteConfirm] = useState({ show: false, id: null, content: '' });
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetchDashboardData();
    fetchAnnouncements();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      // Fetch all students (without pagination limit to get all for stats)
      const response = await api.get('/students?limit=10000');
      
      if (response.data.success) {
        const students = response.data.data?.students || [];
        
        // Calculate statistics based on status
        const totalApplications = students.length;
        
        // Offer Letter Process: Under review, Offer requested, Offer received
        const offerLetterProcess = students.filter(s => {
          const status = s.status || 'Under review';
          return ['Under review', 'Offer requested', 'Offer received'].includes(status);
        }).length;
        
        // Application Processing: Application moved, Ministry submitted, Ministry approved, Fee paid
        const applicationProcessing = students.filter(s => {
          const status = s.status || 'Under review';
          return ['Application moved', 'Ministry submitted', 'Ministry approved', 'Fee paid'].includes(status);
        }).length;
        
        // Visa Process: Visa documents issued, Visa submitted
        const visaProcess = students.filter(s => {
          const status = s.status || 'Under review';
          return ['Visa documents issued', 'Visa submitted'].includes(status);
        }).length;
        
        // Student File Completed: Visa received
        const studentFileCompleted = students.filter(s => {
          const status = s.status || 'Under review';
          return status === 'Visa received';
        }).length;
        
        // Student Dropped: Student dropped
        const studentDropped = students.filter(s => {
          const status = s.status || 'Under review';
          return status === 'Student dropped';
        }).length;
        
        setStats({
          totalApplications,
          offerLetterProcess,
          applicationProcessing,
          visaProcess,
          studentFileCompleted,
          studentDropped
        });

        // Get recent applications (last 10, sorted by creation date)
        const recent = students
          .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
          .slice(0, 10)
          .map(student => {
            const currentStatus = student.status || 'Under review';
            
            // Map statuses to statusType for badge styling
            const statusTypeMap = {
              'Under review': 'warning',
              'Offer requested': 'info',
              'Offer received': 'success',
              'Application moved': 'info',
              'Ministry submitted': 'info',
              'Ministry approved': 'success',
              'Fee paid': 'success',
              'Visa documents issued': 'info',
              'Visa submitted': 'info',
              'Visa received': 'success',
              'Student dropped': 'danger'
            };

            const status = currentStatus;
            const statusType = statusTypeMap[currentStatus] || 'warning';

            // Get initials from full name
            const initials = student.fullName
              ? student.fullName
                  .split(' ')
                  .map(n => n[0])
                  .join('')
                  .toUpperCase()
                  .slice(0, 2)
              : 'NA';

            // Format date
            const createdDate = new Date(student.createdAt);
            const now = new Date();
            const diffMs = now - createdDate;
            const diffMinutes = Math.floor(diffMs / (1000 * 60));
            const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
            const diffDays = Math.floor(diffHours / 24);

            let dateText = '';
            if (diffMinutes < 1) {
              dateText = 'Just now';
            } else if (diffMinutes < 60) {
              dateText = `${diffMinutes} min${diffMinutes > 1 ? 's' : ''} ago`;
            } else if (diffHours < 24) {
              dateText = `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
            } else if (diffDays === 1) {
              dateText = 'Yesterday';
            } else if (diffDays < 7) {
              dateText = `${diffDays} days ago`;
            } else {
              dateText = createdDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            }

            return {
              id: student._id || student.id,
              studentName: student.fullName || 'Unknown',
              initials,
              university: student.universityId?.name || student.universityName || 'Not specified',
              partnerName: student.partner?.companyName || student.partnerId?.companyName || (typeof student.partnerId === 'object' ? student.partnerId?.companyName : 'Unknown Partner'),
              status,
              statusType,
              date: dateText
            };
          });

        setRecentApplications(recent);
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAnnouncements = async () => {
    try {
      const response = await api.get('/announcements?limit=100');
      if (response.data.success) {
        setAnnouncements(response.data.data?.announcements || []);
      }
    } catch (error) {
      console.error('Error fetching announcements:', error);
    }
  };

  const handleDeleteClick = (announcement) => {
    setDeleteConfirm({
      show: true,
      id: announcement._id,
      content: announcement.content
    });
  };

  const handleDeleteConfirm = async () => {
    if (!deleteConfirm.id) return;

    try {
      setDeleting(true);
      const response = await api.delete(`/announcements/${deleteConfirm.id}`);
      
      if (response.data.success) {
        // Remove from local state
        setAnnouncements(prev => prev.filter(a => a._id !== deleteConfirm.id));
        setDeleteConfirm({ show: false, id: null, content: '' });
      } else {
        alert('Failed to delete announcement');
      }
    } catch (error) {
      console.error('Error deleting announcement:', error);
      alert(error.response?.data?.message || 'Failed to delete announcement');
    } finally {
      setDeleting(false);
    }
  };

  const handleDeleteCancel = () => {
    setDeleteConfirm({ show: false, id: null, content: '' });
  };

  const getCategoryInfo = (category) => {
    const categories = {
      reminder: { name: 'Reminder', color: '#3b82f6', bg: '#eff6ff' },
      urgent: { name: 'Urgent', color: '#f59e0b', bg: '#fffbeb' },
      critical: { name: 'Critical', color: '#ef4444', bg: '#fef2f2' }
    };
    return categories[category] || categories.reminder;
  };

  const formatDate = (date) => {
    const createdDate = new Date(date);
    const now = new Date();
    const diffMs = now - createdDate;
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffHours < 1) {
      return 'Just now';
    } else if (diffHours < 24) {
      return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    } else if (diffDays === 1) {
      return 'Yesterday';
    } else if (diffDays < 7) {
      return `${diffDays} days ago`;
    } else {
      return createdDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    }
  };

  const getStatusBadgeClass = (statusType) => {
    const classes = {
      success: 'status-badge success',
      info: 'status-badge info',
      warning: 'status-badge warning',
      danger: 'status-badge danger'
    };
    return classes[statusType] || classes.info;
  };

  return (
    <AdminLayout>
      <div className="admin-dashboard">
        {/* Welcome Section */}
        <div className="welcome-section">
          <h1>Welcome back, {user?.name || 'Admin'} 👋</h1>
          <p className="welcome-subtitle">
            Here's what's happening with Bayroot International today.
          </p>
        </div>

        {loading ? (
          <div className="loading-state">
            <div className="spinner"></div>
            <p>Loading dashboard data...</p>
          </div>
        ) : (
          <>
            {/* Statistics Cards */}
            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-icon total-applications">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                    <path d="M9 12H15M9 16H15M17 21H7C5.89543 21 5 20.1046 5 19V5C5 3.89543 5.89543 3 7 3H12.5858C12.851 3 13.1054 3.10536 13.2929 3.29289L18.7071 8.70711C18.8946 8.89464 19 9.149 19 9.41421V19C19 20.1046 18.1046 21 17 21Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <div className="stat-content">
                  <h3>{stats.totalApplications.toLocaleString()}</h3>
                  <p>Total Applications</p>
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-icon offer-letter-process">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                    <path d="M9 12L11 14L15 10M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <div className="stat-content">
                  <h3>{stats.offerLetterProcess.toLocaleString()}</h3>
                  <p>Offer Letter Process</p>
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-icon application-processing">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                    <path d="M12 6V12L16 14M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <div className="stat-content">
                  <h3>{stats.applicationProcessing.toLocaleString()}</h3>
                  <p>Application Processing</p>
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-icon visa-process">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                    <path d="M9 5H7C5.89543 5 5 5.89543 5 7V19C5 20.1046 5.89543 21 7 21H17C18.1046 21 19 20.1046 19 19V7C19 5.89543 18.1046 5 17 5H15M9 5C9 6.10457 9.89543 7 11 7H13C14.1046 7 15 6.10457 15 5M9 5C9 3.89543 9.89543 3 11 3H13C14.1046 3 15 3.89543 15 5M12 12H15M12 16H15M9 12H9.01M9 16H9.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <div className="stat-content">
                  <h3>{stats.visaProcess.toLocaleString()}</h3>
                  <p>Visa Process</p>
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-icon student-file-completed">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                    <path d="M9 12L11 14L15 10M20 7L12 3L4 7M20 7V17L12 21M20 7L12 11M12 21L4 17V7M12 21V11M4 7L12 11" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <div className="stat-content">
                  <h3>{stats.studentFileCompleted.toLocaleString()}</h3>
                  <p>Student File Completed</p>
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-icon student-dropped">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                    <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <div className="stat-content">
                  <h3>{stats.studentDropped.toLocaleString()}</h3>
                  <p>Student Dropped</p>
                </div>
              </div>
            </div>

            {/* Main Content Grid */}
            <div className="dashboard-content-grid">
              {/* Recent Application Activity */}
              <div className="recent-activity-section">
                <div className="section-header">
                  <h2>Recent Application Activity</h2>
                  <a href="/admin/students" className="view-all-link">View All</a>
                </div>
                {recentApplications.length > 0 ? (
                  <div className="activity-table">
                    <table>
                      <thead>
                        <tr>
                          <th>STUDENT NAME</th>
                          <th>UNIVERSITY</th>
                          <th>PARTNER NAME</th>
                          <th>STATUS</th>
                          <th>DATE</th>
                        </tr>
                      </thead>
                      <tbody>
                        {recentApplications.map((app) => (
                          <tr key={app.id}>
                            <td>
                              <div 
                                className="student-cell clickable"
                                onClick={() => navigate(`/admin/applications/${app.id}`)}
                                style={{ cursor: 'pointer' }}
                              >
                                <div className="student-avatar">{app.initials}</div>
                                <span>{app.studentName}</span>
                              </div>
                            </td>
                            <td>{app.university}</td>
                            <td>{app.partnerName}</td>
                            <td>
                              <span className={getStatusBadgeClass(app.statusType)}>
                                {app.status}
                              </span>
                            </td>
                            <td className="date-cell">{app.date}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="empty-state">
                    <p>No applications found</p>
                    <p className="empty-subtext">Applications will appear here once students are registered.</p>
                  </div>
                )}
              </div>

              {/* Announcements Section */}
              <div className="announcements-section">
                <div className="section-header">
                  <h2>Announcements</h2>
                  <span className="announcement-count">{announcements.length}</span>
                </div>
                {announcements.length > 0 ? (
                  <div className="announcements-list">
                    {announcements.map((announcement) => {
                      const categoryInfo = getCategoryInfo(announcement.category);
                      return (
                        <div key={announcement._id} className="announcement-card">
                          <div className="announcement-header">
                            <div className="announcement-category-badge" style={{ 
                              backgroundColor: categoryInfo.bg,
                              color: categoryInfo.color
                            }}>
                              {categoryInfo.name}
                            </div>
                            <button
                              className="delete-announcement-btn"
                              onClick={() => handleDeleteClick(announcement)}
                              title="Delete announcement"
                            >
                              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                                <path d="M12 4L4 12M4 4L12 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                              </svg>
                            </button>
                          </div>
                          <div className="announcement-content">
                            <p>{announcement.content}</p>
                          </div>
                          <div className="announcement-footer">
                            <span className="announcement-date">{formatDate(announcement.createdAt)}</span>
                            {announcement.hiddenFromPartners?.length > 0 && (
                              <span className="hidden-badge">
                                Hidden from {announcement.hiddenFromPartners.length} {announcement.hiddenFromPartners.length === 1 ? 'consultancy' : 'consultancies'}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="empty-state">
                    <p>No announcements yet</p>
                    <p className="empty-subtext">Create your first announcement using the "New Announcement" button.</p>
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {/* Delete Confirmation Modal */}
        {deleteConfirm.show && (
          <div className="delete-modal-overlay" onClick={handleDeleteCancel}>
            <div className="delete-modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="delete-modal-header">
                <h3>Delete Announcement</h3>
                <button className="delete-modal-close" onClick={handleDeleteCancel} disabled={deleting}>
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                    <path d="M15 5L5 15M5 5L15 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                </button>
              </div>
              <div className="delete-modal-body">
                <p>Are you sure you want to delete this announcement?</p>
                <div className="delete-preview">
                  <p>"{deleteConfirm.content.length > 100 ? deleteConfirm.content.substring(0, 100) + '...' : deleteConfirm.content}"</p>
                </div>
                <p className="delete-warning">This action cannot be undone. The announcement will be removed from all partner interfaces.</p>
              </div>
              <div className="delete-modal-actions">
                <button
                  className="btn-cancel-delete"
                  onClick={handleDeleteCancel}
                  disabled={deleting}
                >
                  Cancel
                </button>
                <button
                  className="btn-confirm-delete"
                  onClick={handleDeleteConfirm}
                  disabled={deleting}
                >
                  {deleting ? (
                    <>
                      <div className="spinner-small"></div>
                      Deleting...
                    </>
                  ) : (
                    'Delete'
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default Dashboard;
