import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminLayout from '../../components/layout/AdminLayout';
import api from '../../api/axios';
import './Applications.css';

const Applications = () => {
  const navigate = useNavigate();
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('All');

  useEffect(() => {
    fetchApplications();
  }, []);

  const fetchApplications = async () => {
    try {
      setLoading(true);
      const response = await api.get('/students?limit=1000');
      if (response.data.success) {
        setApplications(response.data.data?.students || []);
      }
    } catch (error) {
      console.error('Error fetching applications:', error);
    } finally {
      setLoading(false);
    }
  };

  const statusOptions = [
    'All',
    'Under review',
    'Offer requested',
    'Offer received',
    'Application moved',
    'Ministry submitted',
    'Ministry approved',
    'Fee paid',
    'Visa documents issued',
    'Visa submitted',
    'Visa received',
    'Student dropped'
  ];

  const filteredApplications = applications.filter(app => {
    // Filter by status
    if (selectedStatus !== 'All') {
      const appStatus = app.status || 'Under review';
      if (appStatus !== selectedStatus) {
        return false;
      }
    }

    // Filter by search term
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      app.fullName?.toLowerCase().includes(search) ||
      app.universityId?.name?.toLowerCase().includes(search) ||
      app.courseId?.name?.toLowerCase().includes(search) ||
      app.email?.toLowerCase().includes(search) ||
      app.partner?.companyName?.toLowerCase().includes(search) ||
      app.partnerId?.companyName?.toLowerCase().includes(search)
    );
  });

  const getStatusBadge = (app) => {
    const currentStatus = app.status || 'Under review';
    
    // Map statuses to badge classes
    const statusClassMap = {
      'Under review': 'status-warning',
      'Offer requested': 'status-info',
      'Offer received': 'status-success',
      'Application moved': 'status-info',
      'Ministry submitted': 'status-info',
      'Ministry approved': 'status-success',
      'Fee paid': 'status-success',
      'Visa documents issued': 'status-info',
      'Visa submitted': 'status-info',
      'Visa received': 'status-success',
      'Student dropped': 'status-danger'
    };

    return {
      text: currentStatus,
      class: statusClassMap[currentStatus] || 'status-warning'
    };
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffMinutes < 1) {
      return 'Just now';
    } else if (diffMinutes < 60) {
      return `${diffMinutes} min${diffMinutes > 1 ? 's' : ''} ago`;
    } else if (diffHours < 24) {
      return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    } else if (diffDays === 1) {
      return 'Yesterday';
    } else if (diffDays < 7) {
      return `${diffDays} days ago`;
    } else {
      return date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
      });
    }
  };

  const getInitials = (name) => {
    if (!name) return 'NA';
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <AdminLayout>
      <div className="applications-page">
        <div className="page-header">
          <div>
            <h1>Applications</h1>
            <p>View and manage all student applications</p>
          </div>
        </div>

        {/* Search Bar */}
        <div className="search-section">
          <div className="search-container">
            <svg className="search-icon" width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M9.16667 15.8333C12.8486 15.8333 15.8333 12.8486 15.8333 9.16667C15.8333 5.48477 12.8486 2.5 9.16667 2.5C5.48477 2.5 2.5 5.48477 2.5 9.16667C2.5 12.8486 5.48477 15.8333 9.16667 15.8333Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M17.5 17.5L13.875 13.875" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <input
              type="text"
              placeholder="Search by name, university, course, email, or partner..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="clear-search-btn"
                aria-label="Clear search"
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M12 4L4 12M4 4L12 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
              </button>
            )}
          </div>
          <div className="applications-count">
            {filteredApplications.length} {filteredApplications.length === 1 ? 'application' : 'applications'}
          </div>
        </div>

        {/* Status Filter */}
        <div className="filter-section">
          <div className="filter-label">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M2.25 4.5H15.75M4.5 9H13.5M6.75 13.5H11.25" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
            Filter by Status:
          </div>
          <div className="filter-buttons">
            {statusOptions.map((status) => (
              <button
                key={status}
                className={`filter-btn ${selectedStatus === status ? 'active' : ''}`}
                onClick={() => setSelectedStatus(status)}
              >
                {status}
              </button>
            ))}
          </div>
        </div>

        {/* Applications List */}
        {loading ? (
          <div className="loading-state">
            <div className="spinner"></div>
            <p>Loading applications...</p>
          </div>
        ) : filteredApplications.length > 0 ? (
          <div className="applications-table-container">
            <table className="applications-table">
              <thead>
                <tr>
                  <th>Student Name</th>
                  <th>University</th>
                  <th>Course</th>
                  <th>Partner Name</th>
                  <th>Email</th>
                  <th>Documents</th>
                  <th>Status</th>
                  <th>Created Date</th>
                </tr>
              </thead>
              <tbody>
                {filteredApplications.map((app) => {
                  const status = getStatusBadge(app);
                  return (
                    <tr key={app._id || app.id} className="application-row">
                      <td>
                        <div 
                          className="student-name-cell clickable"
                          onClick={() => navigate(`/admin/applications/${app._id || app.id}`)}
                          style={{ cursor: 'pointer' }}
                        >
                          <div className="student-avatar-small">
                            {getInitials(app.fullName)}
                          </div>
                          <span className="student-name">{app.fullName}</span>
                        </div>
                      </td>
                      <td>{app.universityId?.name || 'N/A'}</td>
                      <td>{app.courseId?.name || 'N/A'}</td>
                      <td>{app.partner?.companyName || app.partnerId?.companyName || (typeof app.partnerId === 'object' ? app.partnerId?.companyName : 'Unknown Partner')}</td>
                      <td>{app.email || 'N/A'}</td>
                      <td>
                        <span className="doc-count">
                          {app.documents?.length || 0}
                        </span>
                      </td>
                      <td>
                        <span className={`status-badge ${status.class}`}>
                          {status.text}
                        </span>
                      </td>
                      <td>{formatDate(app.createdAt)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty-state">
            <div className="empty-icon">📋</div>
            <p>No applications found</p>
            <p className="empty-subtext">
              {searchTerm 
                ? 'Try adjusting your search terms' 
                : 'Applications will appear here once students are registered'}
            </p>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default Applications;

