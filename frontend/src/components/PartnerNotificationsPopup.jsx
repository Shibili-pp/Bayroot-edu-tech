import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import ImageLightbox from './ImageLightbox';
import './PartnerNotificationsPopup.css';

const PartnerNotificationsPopup = ({ isOpen, onClose }) => {
  const [actionRequired, setActionRequired] = useState([]);
  const [recentUpdates, setRecentUpdates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [lightboxImage, setLightboxImage] = useState(null);
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

      // Fetch students for document uploads and status updates
      const studentsResponse = await api.get('/students?page=1&limit=50', {
        cacheTTL: 30 * 1000 // Cache for 30 seconds
      });
      
      // Fetch announcements
      const announcementsResponse = await api.get('/announcements/visible?limit=10', {
        cacheTTL: 30 * 1000
      });
      
      const allUpdates = [];
      
      // Process announcements
      if (announcementsResponse.data.success) {
        const announcements = announcementsResponse.data.data?.announcements || [];
        const categoryMap = {
          reminder: { name: 'Reminder', type: 'info' },
          urgent: { name: 'Urgent', type: 'warning' },
          critical: { name: 'Critical', type: 'error' }
        };
        
        announcements.forEach(announcement => {
          const cat = (announcement.category || '').toLowerCase();
          const categoryInfo = categoryMap[cat] || categoryMap.reminder;
          allUpdates.push({
            id: `announcement-${announcement._id}`,
            type: 'announcement',
            category: categoryInfo.name,
            categoryType: categoryInfo.type,
            title: 'New Announcement',
            content: announcement.content,
            imageUrl: announcement.image?.imageUrl || announcement.image?.s3Url || null,
            updatedAt: announcement.createdAt,
            isAnnouncement: true
          });
        });
      }
      
      // Process student updates (document uploads and status changes)
      if (studentsResponse.data.success) {
        const students = studentsResponse.data.data?.students || [];
        
        students.forEach(student => {
          const docCount = student.documents?.length || 0;
          const updatedAt = student.updatedAt || student.createdAt;
          
          // Document uploads
          if (docCount > 0 && student.documents && student.documents.length > 0) {
            const lastDocUpdate = student.documents[student.documents.length - 1]?.uploadedAt || updatedAt;
            allUpdates.push({
              id: `doc-${student._id}`,
              type: 'document',
              studentId: student._id,
              studentName: student.fullName,
              title: `Documents uploaded for ${student.fullName}`,
              subtitle: `${docCount} document${docCount > 1 ? 's' : ''} uploaded`,
              updatedAt: lastDocUpdate,
              docCount: docCount
            });
          }
          
          // Status updates (only if status was updated recently)
          if (student.statusUpdatedAt) {
            const statusUpdateDate = new Date(student.statusUpdatedAt);
            const sevenDaysAgo = new Date();
            sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
            
            if (statusUpdateDate >= sevenDaysAgo) {
              allUpdates.push({
                id: `status-${student._id}`,
                type: 'status',
                studentId: student._id,
                studentName: student.fullName,
                title: `Status updated for ${student.fullName}`,
                subtitle: `Status: ${student.status || 'Under Review'}`,
                updatedAt: student.statusUpdatedAt,
                status: student.status || 'Under Review'
              });
            }
          }
        });
      }
      
      // Sort: Critical announcements first, then by date (most recent first)
      allUpdates.sort((a, b) => {
        const aCritical = a.type === 'announcement' && a.category === 'Critical';
        const bCritical = b.type === 'announcement' && b.category === 'Critical';
        if (aCritical && !bCritical) return -1;
        if (!aCritical && bCritical) return 1;
        const dateA = new Date(a.updatedAt);
        const dateB = new Date(b.updatedAt);
        return dateB - dateA;
      });
      
      // Limit to 15 most recent updates
      setRecentUpdates(allUpdates.slice(0, 15));
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

  const criticalUpdates = recentUpdates.filter(
    u => u.type === 'announcement' && (u.category === 'Critical' || (u.category || '').toLowerCase() === 'critical')
  );
  const nonCriticalRecentUpdates = recentUpdates.filter(
    u => !(u.type === 'announcement' && (u.category === 'Critical' || (u.category || '').toLowerCase() === 'critical'))
  );

  const popupContent = (
    <div className="partner-notifications-popup-overlay" aria-modal="true" role="dialog">
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
              {/* Critical Announcements - Prominent at top */}
              {criticalUpdates.length > 0 && (
                <div className="partner-notifications-section partner-notifications-section--critical">
                  <div className="partner-notifications-section-header partner-notifications-section-header--critical">
                    <span className="partner-notifications-section-icon">🚨</span>
                    <h4>Critical Announcements</h4>
                  </div>
                  <div className="partner-notifications-list">
                    {criticalUpdates.map((update) => (
                      <div
                        key={update.id}
                        className="partner-notification-item partner-notification-item--critical"
                      >
                        <div className="partner-notification-badge partner-notification-badge--critical">
                          🚨
                        </div>
                        <div className="partner-notification-content">
                          <div className="partner-notification-critical-banner">CRITICAL</div>
                          <div className="partner-notification-header">
                            <span className="partner-notification-category partner-notification-category--critical">
                              {update.category}
                            </span>
                            <span className="partner-notification-time">{formatTime(update.updatedAt)}</span>
                          </div>
                          <div className="partner-notification-title partner-notification-title--critical">
                            {update.title}
                          </div>
                          <div className="partner-notification-message partner-notification-message--critical">
                            {update.content?.length > 80 ? update.content.substring(0, 80) + '...' : update.content}
                          </div>
                          {update.imageUrl && (
                            <div 
                              className="partner-notification-announcement-image partner-notification-announcement-image--clickable"
                              onClick={(e) => { e.stopPropagation(); setLightboxImage(update.imageUrl); }}
                              role="button"
                              tabIndex={0}
                              onKeyDown={(e) => e.key === 'Enter' && setLightboxImage(update.imageUrl)}
                              aria-label="View image in full size"
                            >
                              <img src={update.imageUrl} alt="Announcement" />
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

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
                {nonCriticalRecentUpdates.length === 0 && criticalUpdates.length === 0 ? (
                  <div className="partner-notifications-empty-section">
                    <p>No recent updates</p>
                  </div>
                ) : (
                  <div className="partner-notifications-list">
                    {nonCriticalRecentUpdates.map((update) => {
                      const isCritical = update.type === 'announcement' && update.category === 'Critical';
                      return (
                      <div
                        key={update.id}
                        className={`partner-notification-item ${update.type || ''} ${isCritical ? 'partner-notification-item--critical' : ''}`}
                        onClick={() => update.studentId ? handleUpdateClick(update) : undefined}
                      >
                        {update.type === 'announcement' ? (
                          <>
                            <div className={`partner-notification-badge partner-notification-badge-${update.categoryType || 'info'} ${isCritical ? 'partner-notification-badge--critical' : ''}`}>
                              {update.category === 'Urgent' ? '⚠️' : update.category === 'Critical' ? '🚨' : '📋'}
                            </div>
                            <div className="partner-notification-content">
                              {isCritical && (
                                <div className="partner-notification-critical-banner">CRITICAL</div>
                              )}
                              <div className="partner-notification-header">
                                <span className={`partner-notification-category ${isCritical ? 'partner-notification-category--critical' : ''}`}>
                                  {update.category}
                                </span>
                                <span className="partner-notification-time">{formatTime(update.updatedAt)}</span>
                              </div>
                              <div className={`partner-notification-title ${isCritical ? 'partner-notification-title--critical' : ''}`}>
                                {update.title}
                              </div>
                              <div className={`partner-notification-message ${isCritical ? 'partner-notification-message--critical' : ''}`}>
                                {update.content?.length > 80 ? update.content.substring(0, 80) + '...' : update.content}
                              </div>
                              {update.imageUrl && (
                                <div 
                                  className="partner-notification-announcement-image partner-notification-announcement-image--clickable"
                                  onClick={(e) => { e.stopPropagation(); setLightboxImage(update.imageUrl); }}
                                  role="button"
                                  tabIndex={0}
                                  onKeyDown={(e) => e.key === 'Enter' && setLightboxImage(update.imageUrl)}
                                  aria-label="View image in full size"
                                >
                                  <img src={update.imageUrl} alt="Announcement" />
                                </div>
                              )}
                            </div>
                          </>
                        ) : update.type === 'document' ? (
                          <>
                            <div className="partner-notification-avatar">
                              📄
                            </div>
                            <div className="partner-notification-content">
                              <div className="partner-notification-header">
                                <span className="partner-notification-student">{update.studentName || 'Unknown Student'}</span>
                                <span className="partner-notification-time">{formatTime(update.updatedAt)}</span>
                              </div>
                              <div className="partner-notification-title">{update.title}</div>
                              <div className="partner-notification-meta">{update.subtitle}</div>
                            </div>
                          </>
                        ) : (
                          <>
                            <div className="partner-notification-avatar">
                              {update.studentName?.charAt(0)?.toUpperCase() || '👤'}
                            </div>
                            <div className="partner-notification-content">
                              <div className="partner-notification-header">
                                <span className="partner-notification-student">{update.studentName || 'Unknown Student'}</span>
                                <span className="partner-notification-time">{formatTime(update.updatedAt)}</span>
                              </div>
                              <div className="partner-notification-title">{update.title}</div>
                              <div className="partner-notification-meta">{update.subtitle}</div>
                            </div>
                          </>
                        )}
                      </div>
                    );
                    })}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {(actionRequired.length > 0 || recentUpdates.length > 0 || criticalUpdates.length > 0) && (
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
      <ImageLightbox
        isOpen={!!lightboxImage}
        imageUrl={lightboxImage}
        alt="Announcement"
        onClose={() => setLightboxImage(null)}
      />
    </div>
  );

  return createPortal(popupContent, document.body);
};

export default PartnerNotificationsPopup;

