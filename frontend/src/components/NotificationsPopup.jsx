import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import './NotificationsPopup.css';

const NotificationsPopup = ({ isOpen, onClose }) => {
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(false);
  const popupRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (isOpen) {
      fetchUnreadComments();
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

  const fetchUnreadComments = async () => {
    try {
      setLoading(true);
      const response = await api.get('/comments/unread/partner?limit=10', {
        cache: false
      });
      if (response.data.success) {
        setComments(response.data.data?.comments || []);
      }
    } catch (error) {
      console.error('Error fetching unread comments:', error);
      setComments([]);
    } finally {
      setLoading(false);
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
      navigate(`/admin/applications?studentId=${comment.studentId}`);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="notifications-popup-overlay">
      <div className="notifications-popup" ref={popupRef}>
        <div className="notifications-popup-header">
          <h3>Latest Unread Comments</h3>
          <button className="notifications-popup-close" onClick={onClose} aria-label="Close">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M12 4L4 12M4 4L12 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>

        <div className="notifications-popup-content">
          {loading ? (
            <div className="notifications-loading">
              <div className="notifications-spinner"></div>
              <p>Loading comments...</p>
            </div>
          ) : comments.length === 0 ? (
            <div className="notifications-empty">
              <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
                <path d="M24 4C12.9543 4 4 12.9543 4 24C4 35.0457 12.9543 44 24 44C35.0457 44 44 35.0457 44 24C44 12.9543 35.0457 4 24 4Z" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M24 16V24M24 32H24.02" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <p>No unread comments</p>
            </div>
          ) : (
            <div className="notifications-list">
              {comments.map((comment) => (
                <div
                  key={comment.id || comment.commentId}
                  className="notification-item"
                  onClick={() => handleCommentClick(comment)}
                >
                  <div className="notification-avatar">
                    {comment.studentName?.charAt(0)?.toUpperCase() || '👤'}
                  </div>
                  <div className="notification-content">
                    <div className="notification-header">
                      <span className="notification-student">{comment.studentName || 'Unknown Student'}</span>
                      <span className="notification-time">{formatTime(comment.createdAt)}</span>
                    </div>
                    <div className="notification-partner">
                      From: {comment.partnerName || 'Partner'}
                    </div>
                    <div className="notification-message">
                      {comment.messagePreview || comment.message || 'No message'}
                    </div>
                    {comment.hasDocuments && (
                      <div className="notification-documents">
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

        {comments.length > 0 && (
          <div className="notifications-popup-footer">
            <button 
              className="notifications-view-all"
              onClick={() => {
                navigate('/admin/applications');
                onClose();
              }}
            >
              View All Applications
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default NotificationsPopup;

