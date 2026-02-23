import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import AdminLayout from '../../components/layout/AdminLayout';
import StatusAlertPopup from '../../components/StatusAlertPopup';
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
    applicationProcess: 0,
    visaProcess: 0,
    visaReceived: 0,
    visaRejected: 0,
    trcProcess: 0,
    studentDropped: 0
  });
  const [recentApplications, setRecentApplications] = useState([]);
  const [actionItems, setActionItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showStatusAlert, setShowStatusAlert] = useState(false);
  const [pendingStudents, setPendingStudents] = useState([]);
  const isCheckingPendingRef = useRef(false);

  useEffect(() => {
    const abortController = new AbortController();
    
    fetchDashboardData(abortController.signal);
    
    // Check for pending status updates (only if reminder time has passed or no reminder set)
    const checkAndUpdatePendingStatus = () => {
      const reminderData = localStorage.getItem('statusAlertReminder');
      let shouldCheck = false;
      
      if (reminderData) {
        try {
          const { reminderTime } = JSON.parse(reminderData);
          const now = new Date().getTime();
          if (now >= reminderTime) {
            // Reminder time has passed, should check
            shouldCheck = true;
            localStorage.removeItem('statusAlertReminder');
          }
          // If reminder time hasn't passed, don't check
        } catch (error) {
          console.error('Error parsing reminder data:', error);
          localStorage.removeItem('statusAlertReminder');
          // If error parsing, check anyway
          shouldCheck = true;
        }
      } else {
        // No reminder set, check immediately
        shouldCheck = true;
      }
      
      if (shouldCheck && !isCheckingPendingRef.current) {
        checkPendingStatusUpdates();
      }
    };
    
    // Initial check (with small delay to avoid immediate rate limit)
    const initialTimeout = setTimeout(() => {
      checkAndUpdatePendingStatus();
    }, 1000); // Reduced to 1 second for faster initial check
    
    // Check every 10 minutes (reduced frequency to avoid rate limiting)
    const intervalId = setInterval(() => {
      checkAndUpdatePendingStatus();
    }, 10 * 60 * 1000);
    
    return () => {
      abortController.abort();
      clearTimeout(initialTimeout);
      clearInterval(intervalId);
    };
  }, []);

  const fetchDashboardData = async (signal) => {
    try {
      setLoading(true);
      
      // Fetch students with pagination (backend enforces max 50 per page)
      // We'll fetch multiple pages if needed for stats calculation
      // REFACTORED: Added pagination loop guard to prevent infinite loops
      let allStudents = [];
      let page = 1;
      const limit = 50; // Backend maximum
      let hasMore = true;
      const maxIterations = 5; // Safety guard: max 5 pages (250 students max)
      let iterationCount = 0;

      // REFACTORED: Added maxIterations guard to prevent infinite loops
      // This protects against backend pagination bugs or inconsistent responses
      while (hasMore && allStudents.length < 200 && iterationCount < maxIterations) {
        iterationCount++;
        
        try {
          const response = await api.get(`/students?page=${page}&limit=${limit}`, {
            signal: signal,
            cacheTTL: 30 * 1000 // Cache for 30 seconds
          });
          
          if (response.data.success) {
            const students = response.data.data?.students || [];
            allStudents = [...allStudents, ...students];
            
            const pagination = response.data.data?.pagination;
            // Safety check: ensure pagination data is valid
            if (pagination && typeof pagination.pages === 'number') {
              hasMore = page < pagination.pages && allStudents.length < 200;
            } else {
              // If pagination data is missing or invalid, stop fetching
              hasMore = false;
            }
            page++;
          } else {
            // API returned error, stop fetching
            hasMore = false;
          }
        } catch (error) {
          // If request fails (network error, abort, etc.), stop fetching
          // Don't break the entire dashboard load, just use what we have
          console.error(`Error fetching page ${page}:`, error);
          hasMore = false;
        }
      }

      // Log warning if we hit the iteration limit (indicates potential issue)
      if (iterationCount >= maxIterations) {
        console.warn('Pagination loop reached max iterations. This may indicate a backend pagination issue.');
      }

      const students = allStudents;
      
      // Calculate statistics based on status
      const totalApplications = students.length;
      
      // Offer Letter Process: Under Review, Offer Requested, Offer Received
      const offerLetterProcess = students.filter(s => {
        const status = s.status || 'Under Review';
        return ['Under Review', 'Offer Requested', 'Offer Received'].includes(status);
      }).length;
      
      // Application Process: Application payment 1 received, Application Moved, Ministry Submitted, Exam issued, Application payment 2 received, Fee Paid
      const applicationProcess = students.filter(s => {
        const status = s.status || 'Under Review';
        return ['Application payment 1 received', 'Application Moved', 'Ministry Submitted', 'Exam issued', 'Application payment 2 received', 'Fee Paid'].includes(status);
      }).length;
      
      // Visa Process: Visa Documents Issued, Visa Submitted, Full fee, Application payment 3 received
      const visaProcess = students.filter(s => {
        const status = s.status || 'Under Review';
        return ['Visa Documents Issued', 'Visa Submitted', 'Full fee', 'Application payment 3 received'].includes(status);
      }).length;
      
      // Visa Received: Visa Received
      const visaReceived = students.filter(s => {
        const status = s.status || 'Under Review';
        return status === 'Visa Received';
      }).length;
      
      // Visa Rejected: Visa rejected
      const visaRejected = students.filter(s => {
        const status = s.status || 'Under Review';
        return status === 'Visa rejected';
      }).length;
      
      // TRC Process: Trc request, Trc approved, Trc rejected
      const trcProcess = students.filter(s => {
        const status = s.status || 'Under Review';
        return ['Trc request', 'Trc approved', 'Trc rejected'].includes(status);
      }).length;
      
      // Student Dropped: Student Dropped
      const studentDropped = students.filter(s => {
        const status = s.status || 'Under Review';
        return status === 'Student Dropped';
      }).length;
      
      setStats({
        totalApplications,
        offerLetterProcess,
        applicationProcess,
        visaProcess,
        visaReceived,
        visaRejected,
        trcProcess,
        studentDropped
      });

      // Get recent applications (last 7, sorted by creation date)
      const recent = students
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .slice(0, 7)
        .map(student => {
          const currentStatus = student.status || 'Under Review';
          
          // Map statuses to statusType for badge styling
          const statusTypeMap = {
            'Under Review': 'info',
            'Offer Requested': 'info',
            'Offer Received': 'success',
            'Application payment 1 received': 'info',
            'Application Moved': 'info',
            'Ministry Submitted': 'info',
            'Exam issued': 'info',
            'Application payment 2 received': 'info',
            'Fee Paid': 'success',
            'Visa Documents Issued': 'info',
            'Visa Submitted': 'info',
            'Visa Received': 'success',
            'Full fee': 'success',
            'Application payment 3 received': 'success',
            'Visa rejected': 'danger',
            'Trc request': 'info',
            'Trc approved': 'success',
            'Trc rejected': 'danger',
            'Student Dropped': 'danger'
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

      // Fetch unread partner comments using bulk endpoint (single API call)
      try {
        const unreadCommentsResponse = await api.get('/comments/unread/partner?limit=4', {
          signal: signal
        });
        if (unreadCommentsResponse.data.success) {
          const unreadComments = unreadCommentsResponse.data.data.comments || [];
          
          // Format action items from unread comments
          const actionItemsFromComments = unreadComments.map(comment => {
            const commentDate = new Date(comment.createdAt);
            const now = new Date();
            const diffMs = now - commentDate;
            const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
            const diffDays = Math.floor(diffHours / 24);
            
            let timeText = '';
            if (diffHours < 1) {
              timeText = 'Just now';
            } else if (diffHours < 24) {
              timeText = `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
            } else if (diffDays === 1) {
              timeText = 'Yesterday';
            } else if (diffDays < 7) {
              timeText = `${diffDays} days ago`;
            } else {
              timeText = commentDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            }
            
            return {
              id: comment.id,
              studentId: comment.studentId,
              name: comment.studentName,
              partnerName: comment.partnerName,
              comment: comment.messagePreview,
              commentId: comment.commentId,
              timeText: timeText,
              avatar: comment.studentName?.charAt(0)?.toUpperCase() || '👤',
              createdAt: comment.createdAt
            };
          });
          
          setActionItems(actionItemsFromComments);
        } else {
          setActionItems([]);
        }
      } catch (error) {
        // Don't log errors if request was aborted
        if (error.name === 'AbortError' || error.name === 'CanceledError') {
          return;
        }
        console.error('Error fetching unread comments:', error);
        setActionItems([]);
      }
    } catch (error) {
      // Don't log errors if request was aborted
      if (error.name === 'AbortError' || error.name === 'CanceledError') {
        return;
      }
      
      // Handle rate limit errors
      if (error.response?.status === 429) {
        console.warn('Rate limit exceeded. Please wait a moment before refreshing.');
        // Optionally show user-friendly message
        // You could set an error state here to display to the user
      } else {
        console.error('Error fetching dashboard data:', error);
      }
    } finally {
      setLoading(false);
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

  const checkPendingStatusUpdates = async () => {
    // Prevent concurrent calls
    if (isCheckingPendingRef.current) {
      return;
    }

    // Check if there's a reminder set and it hasn't passed yet
    const reminderData = localStorage.getItem('statusAlertReminder');
    if (reminderData) {
      try {
        const { reminderTime } = JSON.parse(reminderData);
        const now = new Date().getTime();
        if (now < reminderTime) {
          // Reminder time hasn't passed yet, don't show alert
          console.log('Reminder time not reached yet. Reminder set for:', new Date(reminderTime));
          return;
        }
      } catch (error) {
        console.error('Error parsing reminder data:', error);
        localStorage.removeItem('statusAlertReminder');
      }
    }

    isCheckingPendingRef.current = true;
    try {
      console.log('Checking for pending status updates...');
      const response = await api.get('/status-timeline/pending-updates', {
        cache: false // Disable cache for this check to get fresh data
      });
      if (response.data.success) {
        const pending = response.data.data?.pendingStudents || [];
        console.log('Pending students found:', pending.length, pending);
        console.log('Full response:', response.data);
        if (pending.length > 0) {
          console.log('Setting pending students and showing alert');
          setPendingStudents(pending);
          setShowStatusAlert(true);
        } else {
          console.log('No pending students found, hiding alert');
          // No pending students, hide alert if it was showing
          setShowStatusAlert(false);
        }
      } else {
        console.log('API response not successful:', response.data);
      }
    } catch (error) {
      // Handle rate limiting gracefully - don't retry immediately
      if (error.response?.status === 429) {
        console.warn('Rate limit exceeded for pending status updates. Will retry later.');
        // Don't show error to user, just log it
        // Don't show alert on rate limit error
        setShowStatusAlert(false);
      } else {
        console.error('Error checking pending status updates:', error);
        // Don't show alert on error
        setShowStatusAlert(false);
      }
    } finally {
      isCheckingPendingRef.current = false;
    }
  };

  const handleSetReminder = async (hours) => {
    const now = new Date().getTime();
    const reminderTime = now + (hours * 60 * 60 * 1000);
    
    localStorage.setItem('statusAlertReminder', JSON.stringify({
      reminderTime,
      setAt: now,
      hours
    }));
    
    setShowStatusAlert(false);
    setPendingStudents([]);
  };

  const handleStatClick = (filterType) => {
    // Map filter types to status filters for Applications page
    const filterMap = {
      'totalApplications': 'All',
      'offerLetterProcess': 'offer-letter', // Special category
      'applicationProcess': 'application', // Special category
      'visaProcess': 'visa', // Special category
      'visaReceived': 'Visa Received',
      'visaRejected': 'Visa rejected',
      'trcProcess': 'trc', // Special category
      'studentDropped': 'Student Dropped'
    };

    const filter = filterMap[filterType];
    if (filter) {
      navigate(`/admin/applications?filter=${encodeURIComponent(filter)}`);
    }
  };

  const handleActionItemClick = (item) => {
    if (item.studentId) {
      navigate(`/admin/applications/${item.studentId}`);
    }
  };

  return (
    <AdminLayout>
      {showStatusAlert && (
        <StatusAlertPopup
          pendingStudents={pendingStudents}
          onSetReminder={handleSetReminder}
        />
      )}
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
              <div className="stat-card clickable" onClick={() => handleStatClick('totalApplications')}>
                <div className="stat-icon total-applications">
                  <svg viewBox="0 0 24 24" fill="none">
                    <path d="M9 12H15M9 16H15M17 21H7C5.89543 21 5 20.1046 5 19V5C5 3.89543 5.89543 3 7 3H12.5858C12.851 3 13.1054 3.10536 13.2929 3.29289L18.7071 8.70711C18.8946 8.89464 19 9.149 19 9.41421V19C19 20.1046 18.1046 21 17 21Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <div className="stat-content">
                  <h3>{stats.totalApplications.toLocaleString()}</h3>
                  <p>Total Applications</p>
                </div>
              </div>

              <div className="stat-card clickable" onClick={() => handleStatClick('offerLetterProcess')}>
                <div className="stat-icon offer-letter-process">
                  <svg viewBox="0 0 24 24" fill="none">
                    <path d="M9 12L11 14L15 10M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <div className="stat-content">
                  <h3>{stats.offerLetterProcess.toLocaleString()}</h3>
                  <p>Offer Letter Process</p>
                </div>
              </div>

              <div className="stat-card clickable" onClick={() => handleStatClick('applicationProcess')}>
                <div className="stat-icon application-processing">
                  <svg viewBox="0 0 24 24" fill="none">
                    <path d="M12 6V12L16 14M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <div className="stat-content">
                  <h3>{stats.applicationProcess.toLocaleString()}</h3>
                  <p>Application Process</p>
                </div>
              </div>

              <div className="stat-card clickable" onClick={() => handleStatClick('visaProcess')}>
                <div className="stat-icon visa-process">
                  <svg viewBox="0 0 24 24" fill="none">
                    <path d="M9 5H7C5.89543 5 5 5.89543 5 7V19C5 20.1046 5.89543 21 7 21H17C18.1046 21 19 20.1046 19 19V7C19 5.89543 18.1046 5 17 5H15M9 5C9 6.10457 9.89543 7 11 7H13C14.1046 7 15 6.10457 15 5M9 5C9 3.89543 9.89543 3 11 3H13C14.1046 3 15 3.89543 15 5M12 12H15M12 16H15M9 12H9.01M9 16H9.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <div className="stat-content">
                  <h3>{stats.visaProcess.toLocaleString()}</h3>
                  <p>Visa Process</p>
                </div>
              </div>

              <div className="stat-card success clickable" onClick={() => handleStatClick('visaReceived')}>
                <div className="stat-icon visa-received">
                  <svg viewBox="0 0 24 24" fill="none">
                    <path d="M9 12L11 14L15 10M20 7L12 3L4 7M20 7V17L12 21M20 7L12 11M12 21L4 17V7M12 21V11M4 7L12 11" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <div className="stat-content">
                  <h3>{stats.visaReceived.toLocaleString()}</h3>
                  <p>Visa Received</p>
                </div>
              </div>

              <div className="stat-card danger clickable" onClick={() => handleStatClick('visaRejected')}>
                <div className="stat-icon visa-rejected">
                  <svg viewBox="0 0 24 24" fill="none">
                    <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <div className="stat-content">
                  <h3>{stats.visaRejected.toLocaleString()}</h3>
                  <p>Visa Rejected</p>
                </div>
              </div>

              <div className="stat-card clickable" onClick={() => handleStatClick('trcProcess')}>
                <div className="stat-icon trc-process">
                  <svg viewBox="0 0 24 24" fill="none">
                    <path d="M9 5H7C5.89543 5 5 5.89543 5 7V19C5 20.1046 5.89543 21 7 21H17C18.1046 21 19 20.1046 19 19V7C19 5.89543 18.1046 5 17 5H15M9 5C9 6.10457 9.89543 7 11 7H13C14.1046 7 15 6.10457 15 5M9 5C9 3.89543 9.89543 3 11 3H13C14.1046 3 15 3.89543 15 5M12 12H15M12 16H15M9 12H9.01M9 16H9.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <div className="stat-content">
                  <h3>{stats.trcProcess.toLocaleString()}</h3>
                  <p>TRC Process</p>
                </div>
              </div>

              <div className="stat-card clickable" onClick={() => handleStatClick('studentDropped')}>
                <div className="stat-icon student-dropped">
                  <svg viewBox="0 0 24 24" fill="none">
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

              {/* Latest Unread Comments Section */}
              <div className="action-section">
                <div className="section-header">
                  <h2 className="section-title">
                    <span className="action-icon">!</span>
                    Latest Unread Comments
                  </h2>
                  <a href="/admin/applications" className="view-all-link">View all</a>
                </div>

                <div className="action-list">
                  {actionItems.length > 0 ? (
                    actionItems.map((item) => (
                      <div 
                        key={item.id} 
                        className="action-item clickable"
                        onClick={() => handleActionItemClick(item)}
                        style={{ cursor: 'pointer' }}
                      >
                        <div className="action-avatar">{item.avatar}</div>
                        <div className="action-details">
                          <div className="action-name">{item.name}</div>
                          {item.comment ? (
                            <>
                              <div className="action-meta">
                                <span className="comment-preview">{item.comment}</span>
                              </div>
                              <div className="action-required">
                                <span className="action-text">New Comment from {item.partnerName}</span>
                                <span className="deadline">
                                  <span className="clock-icon">🕐</span>
                                  {item.timeText}
                                </span>
                              </div>
                            </>
                          ) : null}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="empty-action-state">
                      <p>No new comments at this time.</p>
                      <p className="empty-subtext">All comments have been viewed.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </AdminLayout>
  );
};

export default Dashboard;
