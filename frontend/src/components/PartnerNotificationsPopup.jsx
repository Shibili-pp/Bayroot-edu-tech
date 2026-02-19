import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import './PartnerNotificationsPopup.css';

const PartnerNotificationsPopup = ({ isOpen, onClose }) => {
  const [actionRequired, setActionRequired] = useState([]);
  const [recentUpdates, setRecentUpdates] = useState([]);
  const [loading, setLoading] = useState(false);
  const popupRef = useRef(null);
  const fetchingRef = useRef(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (isOpen && !fetchingRef.current) {
      fetchNotifications();
    }
  }, [isOpen]);

  // Close popup when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (popupRef.current && !popupRef.current.contains(event.target)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  const fetchNotifications = async () => {
    // Prevent duplicate calls
    if (fetchingRef.current) return;
    
    try {
      fetchingRef.current = true;
      setLoading(true);
      
      // Fetch unread admin comments (Action Required) - use cache with short TTL
      const commentsResponse = await api.get('/comments/unread/admin?limit=10', {
        cacheTTL: 10 * 1000 // Cache for 10 seconds
      });
      if (commentsResponse.data.success) {
        setActionRequired(commentsResponse.data.data?.comments || []);
      }

      // Fetch recent student updates - use smaller limit and cache
      // Only fetch first page with smaller limit to reduce API load
      const studentsResponse = await api.get('/students?page=1&limit=20', {
        cacheTTL: 30 * 1000 // Cache for 30 seconds
      });
      if (studentsResponse.data.success) {
        const students = studentsResponse.data.data?.students || [];
        
        // Get recent updates (students with statusUpdatedAt in last 7 days)
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        
        const updates = students
          .filter(student => {
            if (!student.statusUpdatedAt) return false;
            const updatedAt = new Date(student.statusUpdatedAt);
            return updatedAt >= sevenDaysAgo;
          })
          .sort((a, b) => {
            const dateA = new Date(a.statusUpdatedAt || a.updatedAt);
            const dateB = new Date(b.statusUpdatedAt || b.updatedAt);
            return dateB - dateA;
          })
          .slice(0, 10)
          .map(student => ({
            id: student._id,
            studentId: student._id,
            studentName: student.fullName,
            status: student.status || 'Under Review',
            updatedAt: student.statusUpdatedAt || student.updatedAt,
            university: student.university || 'N/A',
            course: student.course || 'N/A'
          }));
        
        setRecentUpdates(updates);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
      // Don't clear existing data on error, just log it
      if (error.response?.status !== 429) {
        setActionRequired([]);
        setRecentUpdates([]);
      }
    } finally {
      setLoading(false);
      fetchingRef.current = false;
    }
  };

  const formatTime = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);
    const diffMinutes = Math.floor(diffMs / (1000 * 60));

    if (diffMinutes < 1) {
      return 'Just now';
    } else if (diffMinutes < 60) {
      return `${diffMinutes} minute${diffMinutes > 1 ? 's' : ''} ago`;
    } else if (diffHours < 24) {
      return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    } else if (diffDays === 1) {
      return 'Yesterday';
    } else if (diffDays < 7) {
      return `${diffDays} days ago`;
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
  };

  const handleCommentClick = (comment) => {
    if (comment.studentId) {
      navigate(`/partner/students?studentId=${comment.studentId}`);
      onClose();
    }
  };

  const handleUpdateClick = (update) => {
    if (update.studentId) {
      navigate(`/partner/students?studentId=${update.studentId}`);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="partner-notifications-popup-overlay">
      <div className="partner-notifications-popup" ref={popupRef}>
        <div className="partner-notifications-popup-header">
          <h3>Notifications</h3>
          <button className="partner-notifications-popup-close" onClick={onClose} aria-label="Close">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M12 4L4 12M4 4L12 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>

        <div className="partner-notifications-popup-content">
          {loading ? (
            <div className="partner-notifications-loading">
              <div className="partner-notifications-spinner"></div>
              <p>Loading notifications...</p>
            </div>
          ) : (
            <>
              {/* Action Required Section */}
              <div className="partner-notifications-section">
                <div className="partner-notifications-section-header">
                  <span className="partner-notifications-section-icon">!</span>
                  <h4>Action Required</h4>
                </div>
                {actionRequired.length === 0 ? (
                  <div className="partner-notifications-empty-section">
                    <p>No action required</p>
                  </div>
                ) : (
                  <div className="partner-notifications-list">
                    {actionRequired.map((comment) => (
                      <div
                        key={comment.id || comment.commentId}
                        className="partner-notification-item"
                        onClick={() => handleCommentClick(comment)}
                      >
                        <div className="partner-notification-avatar">
                          {comment.studentName?.charAt(0)?.toUpperCase() || '👤'}
                        </div>
                        <div className="partner-notification-content">
                          <div className="partner-notification-header">
                            <span className="partner-notification-student">{comment.studentName || 'Unknown Student'}</span>
                            <span className="partner-notification-time">{formatTime(comment.createdAt)}</span>
                          </div>
                          <div className="partner-notification-message">
                            {comment.messagePreview || comment.message || 'New comment from admin'}
                          </div>
                          {comment.hasDocuments && (
                            <div className="partner-notification-documents">
                              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                                <path d="M6 1V7M1 6H7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                              </svg>
                              Has attachments
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Recent Updates Section */}
              <div className="partner-notifications-section">
                <div className="partner-notifications-section-header">
                  <span className="partner-notifications-section-icon">📋</span>
                  <h4>Recent Updates</h4>
                </div>
                {recentUpdates.length === 0 ? (
                  <div className="partner-notifications-empty-section">
                    <p>No recent updates</p>
                  </div>
                ) : (
                  <div className="partner-notifications-list">
                    {recentUpdates.map((update) => (
                      <div
                        key={update.id}
                        className="partner-notification-item"
                        onClick={() => handleUpdateClick(update)}
                      >
                        <div className="partner-notification-avatar">
                          {update.studentName?.charAt(0)?.toUpperCase() || '👤'}
                        </div>
                        <div className="partner-notification-content">
                          <div className="partner-notification-header">
                            <span className="partner-notification-student">{update.studentName || 'Unknown Student'}</span>
                            <span className="partner-notification-time">{formatTime(update.updatedAt)}</span>
                          </div>
                          <div className="partner-notification-status">
                            Status: <strong>{update.status}</strong>
                          </div>
                          <div className="partner-notification-meta">
                            {update.university} • {update.course}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {(actionRequired.length > 0 || recentUpdates.length > 0) && (
          <div className="partner-notifications-popup-footer">
            <button 
              className="partner-notifications-view-all"
              onClick={() => {
                navigate('/partner/students');
                onClose();
              }}
            >
              View All Students
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default PartnerNotificationsPopup;

