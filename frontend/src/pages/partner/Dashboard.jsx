import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import PartnerLayout from '../../components/layout/PartnerLayout';
import DocumentUploadModal from '../../components/DocumentUploadModal';
import api from '../../api/axios';
import './Dashboard.css';

/**
 * Partner Home Page - Using Real Data
 */
const Dashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    totalApplications: 0,
    offerLetterProcess: 0,
    applicationProcessing: 0,
    visaProcess: 0,
    studentFileCompleted: 0,
    studentDropped: 0
  });
  const [actionItems, setActionItems] = useState([]);
  const [recentUpdates, setRecentUpdates] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploadModal, setUploadModal] = useState({
    isOpen: false,
    studentId: null,
    studentName: '',
    missingDocument: ''
  });

  useEffect(() => {
    const fetchData = async () => {
      let studentUpdates = [];
      
      try {
        // Fetch all students (without pagination limit to get all)
        const studentsResponse = await api.get('/students?limit=1000');
        if (studentsResponse.data.success) {
          const students = studentsResponse.data.data?.students || [];
          
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

          // Generate action items from students missing documents
          // Helper function to detect missing documents (more lenient)
          const detectMissingDocuments = (student) => {
            const documents = student.documents || [];
            const docCount = documents.length;
            const missingDocs = [];
            
            // If student has 3+ documents, consider them complete (don't check specific types)
            if (docCount >= 3) {
              return [];
            }
            
            // Only check for specific missing documents if student has less than 3 documents
            // Check for Passport Copy - look for passport-related keywords
            const hasPassport = documents.some(d => {
              const name = (d.originalName || d.filename || d.url || '').toLowerCase();
              return name.includes('passport') || name.includes('pass');
            });
            if (!hasPassport && docCount < 3) {
              missingDocs.push('Passport Copy');
            }
            
            // Check for IELTS Certificate
            const hasIELTS = documents.some(d => {
              const name = (d.originalName || d.filename || d.url || '').toLowerCase();
              return name.includes('ielts') || name.includes('english') || name.includes('language');
            });
            if (!hasIELTS && docCount < 3) {
              missingDocs.push('IELTS Certificate');
            }
            
            // Check for Bank Statement
            const hasBankStatement = documents.some(d => {
              const name = (d.originalName || d.filename || d.url || '').toLowerCase();
              return name.includes('bank') || name.includes('statement') || name.includes('financial');
            });
            if (!hasBankStatement && docCount < 3) {
              missingDocs.push('Bank Statement');
            }
            
            // Check for Visa Copy
            const hasVisa = documents.some(d => {
              const name = (d.originalName || d.filename || d.url || '').toLowerCase();
              return name.includes('visa');
            });
            if (!hasVisa && docCount < 3) {
              missingDocs.push('Visa Copy');
            }
            
            return missingDocs;
          };

          const studentsNeedingDocs = students
            .map((student) => {
              const docCount = student.documents?.length || 0;
              const createdDate = new Date(student.createdAt);
              const daysSinceCreation = Math.floor((Date.now() - createdDate.getTime()) / (1000 * 60 * 60 * 24));
              
              // If student has 3+ documents, skip them (they have enough documents)
              if (docCount >= 3) {
                return null;
              }
              
              // Detect missing documents
              const missingDocs = detectMissingDocuments(student);
              
              // Determine action text
              let actionText = '';
              if (docCount === 0) {
                actionText = 'MISSING Documents';
              } else if (missingDocs.length > 0) {
                actionText = `MISSING ${missingDocs[0]}`;
              } else {
                actionText = `MISSING Documents (${3 - docCount} more needed)`;
              }
              
              // Calculate deadline (7 days from creation, or urgent if less than 24 hours left)
              const deadlineDays = Math.max(0, 7 - daysSinceCreation);
              const hoursLeft = deadlineDays * 24;
              
              let deadlineText = '';
              if (hoursLeft < 24) {
                deadlineText = `${hoursLeft} hours left`;
              } else if (deadlineDays === 0) {
                deadlineText = 'Overdue';
              } else {
                deadlineText = `${deadlineDays} day${deadlineDays > 1 ? 's' : ''} left`;
              }

              return {
                id: student._id || student.id,
                name: student.fullName,
                university: student.universityId?.name || student.countryPreference || 'N/A',
                course: student.courseId?.name || student.coursePreference || 'N/A',
                action: actionText,
                deadline: deadlineText,
                hours: hoursLeft,
                avatar: student.fullName?.charAt(0)?.toUpperCase() || '👤',
                studentId: student._id || student.id,
                missingDocument: missingDocs.length > 0 ? missingDocs[0] : 'Documents',
                docCount: docCount
              };
            })
            .filter(item => item !== null) // Remove null entries
            .sort((a, b) => {
              // Sort by urgency: overdue first, then by hours left, then by doc count (fewer docs first)
              if (a.hours < 24 && b.hours >= 24) return -1;
              if (a.hours >= 24 && b.hours < 24) return 1;
              if (a.hours === b.hours) {
                return a.docCount - b.docCount; // Fewer documents = higher priority
              }
              return a.hours - b.hours;
            })
            .slice(0, 4); // Show max 4 action items

          setActionItems(studentsNeedingDocs);

          // Generate recent updates from student activities
          const recentStudents = students
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
            .slice(0, 4);
          
          studentUpdates = recentStudents.map((student, index) => {
            const createdDate = new Date(student.createdAt);
            const now = new Date();
            const diffMs = now - createdDate;
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
              timeText = createdDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            }

            const docCount = student.documents?.length || 0;
            let updateType = 'info';
            let title = '';
            let subtitle = '';

            if (docCount >= 3) {
              updateType = 'success';
              title = `Application completed for ${student.fullName}`;
              subtitle = `${student.countryPreference} • ${student.coursePreference}`;
            } else if (docCount > 0) {
              updateType = 'warning';
              title = `Documents uploaded for ${student.fullName}`;
              subtitle = `${docCount} document${docCount > 1 ? 's' : ''} uploaded`;
            } else {
              updateType = 'info';
              title = `New student registered: ${student.fullName}`;
              subtitle = `${student.countryPreference} • ${student.coursePreference}`;
            }

            return {
              time: timeText,
              type: updateType,
              title,
              subtitle
            };
          });
        }

        // Fetch announcements
        try {
          const announcementsResponse = await api.get('/announcements/visible?limit=10');
          console.log('Announcements response:', announcementsResponse.data);
          if (announcementsResponse.data.success) {
            const fetchedAnnouncements = announcementsResponse.data.data?.announcements || [];
            console.log('Fetched announcements:', fetchedAnnouncements);
            
            // Format announcements for display
            const formattedAnnouncements = fetchedAnnouncements.map(announcement => {
              const createdDate = new Date(announcement.createdAt);
              const now = new Date();
              const diffMs = now - createdDate;
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
                timeText = createdDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
              }

              // Map category to display name and color
              const categoryMap = {
                reminder: { name: 'Reminder', color: '#3b82f6', type: 'info' },
                urgent: { name: 'Urgent', color: '#f59e0b', type: 'warning' },
                critical: { name: 'Critical', color: '#ef4444', type: 'error' }
              };

              const categoryInfo = categoryMap[announcement.category] || categoryMap.reminder;

              return {
                id: announcement._id,
                time: timeText,
                type: categoryInfo.type,
                category: categoryInfo.name,
                categoryColor: categoryInfo.color,
                title: 'New Announcement',
                subtitle: announcement.content.length > 60 
                  ? announcement.content.substring(0, 60) + '...' 
                  : announcement.content,
                fullContent: announcement.content,
                isAnnouncement: true
              };
            });

            // Combine announcements with student updates and sort by time
            const allUpdates = [...formattedAnnouncements, ...studentUpdates];
            allUpdates.sort((a, b) => {
              // Sort by time (most recent first)
              // Announcements should appear first if same time
              if (a.isAnnouncement && !b.isAnnouncement) return -1;
              if (!a.isAnnouncement && b.isAnnouncement) return 1;
              return 0;
            });

            setAnnouncements(formattedAnnouncements);
            setRecentUpdates(allUpdates.slice(0, 10)); // Show max 10 updates
          } else {
            // If no announcements, just show student updates
            setRecentUpdates(studentUpdates);
          }
        } catch (announcementError) {
          console.error('Error fetching announcements:', announcementError);
          // Continue with student updates only
          setRecentUpdates(studentUpdates);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
        // Set empty states on error
        setActionItems([]);
        setRecentUpdates([]);
        setAnnouncements([]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const handleUploadClick = (item) => {
    // Open upload modal with student info
    setUploadModal({
      isOpen: true,
      studentId: item.studentId,
      studentName: item.name,
      missingDocument: item.missingDocument || 'Document'
    });
  };

  const handleUploadSuccess = async () => {
    // Refresh data after successful upload without full page reload
    setLoading(true);
    try {
      const studentsResponse = await api.get('/students?limit=1000');
      if (studentsResponse.data.success) {
        const students = studentsResponse.data.data?.students || [];
        
        // Recalculate action items with updated data (same logic as initial fetch)
        const detectMissingDocuments = (student) => {
          const documents = student.documents || [];
          const docCount = documents.length;
          const missingDocs = [];
          
          // If student has 3+ documents, consider them complete
          if (docCount >= 3) {
            return [];
          }
          
          const hasPassport = documents.some(d => {
            const name = (d.originalName || d.filename || d.url || '').toLowerCase();
            return name.includes('passport') || name.includes('pass');
          });
          if (!hasPassport && docCount < 3) missingDocs.push('Passport Copy');
          
          const hasIELTS = documents.some(d => {
            const name = (d.originalName || d.filename || d.url || '').toLowerCase();
            return name.includes('ielts') || name.includes('english') || name.includes('language');
          });
          if (!hasIELTS && docCount < 3) missingDocs.push('IELTS Certificate');
          
          const hasBankStatement = documents.some(d => {
            const name = (d.originalName || d.filename || d.url || '').toLowerCase();
            return name.includes('bank') || name.includes('statement') || name.includes('financial');
          });
          if (!hasBankStatement && docCount < 3) missingDocs.push('Bank Statement');
          
          const hasVisa = documents.some(d => {
            const name = (d.originalName || d.filename || d.url || '').toLowerCase();
            return name.includes('visa');
          });
          if (!hasVisa && docCount < 3) missingDocs.push('Visa Copy');
          
          return missingDocs;
        };

        const studentsNeedingDocs = students
          .map((student) => {
            const docCount = student.documents?.length || 0;
            
            // If student has 3+ documents, skip them (they have enough documents)
            if (docCount >= 3) {
              return null;
            }
            
            const createdDate = new Date(student.createdAt);
            const daysSinceCreation = Math.floor((Date.now() - createdDate.getTime()) / (1000 * 60 * 60 * 24));
            const missingDocs = detectMissingDocuments(student);
            
            let actionText = '';
            if (docCount === 0) {
              actionText = 'MISSING Documents';
            } else if (missingDocs.length > 0) {
              actionText = `MISSING ${missingDocs[0]}`;
            } else {
              actionText = `MISSING Documents (${3 - docCount} more needed)`;
            }
            
            const deadlineDays = Math.max(0, 7 - daysSinceCreation);
            const hoursLeft = deadlineDays * 24;
            
            let deadlineText = '';
            if (hoursLeft < 24) {
              deadlineText = `${hoursLeft} hours left`;
            } else if (deadlineDays === 0) {
              deadlineText = 'Overdue';
            } else {
              deadlineText = `${deadlineDays} day${deadlineDays > 1 ? 's' : ''} left`;
            }

            return {
              id: student._id || student.id,
              name: student.fullName,
              university: student.universityId?.name || student.countryPreference || 'N/A',
              course: student.courseId?.name || student.coursePreference || 'N/A',
              action: actionText,
              deadline: deadlineText,
              hours: hoursLeft,
              avatar: student.fullName?.charAt(0)?.toUpperCase() || '👤',
              studentId: student._id || student.id,
              missingDocument: missingDocs.length > 0 ? missingDocs[0] : 'Documents',
              docCount: docCount
            };
          })
          .filter(item => item !== null)
          .sort((a, b) => {
            if (a.hours < 24 && b.hours >= 24) return -1;
            if (a.hours >= 24 && b.hours < 24) return 1;
            if (a.hours === b.hours) {
              return a.docCount - b.docCount;
            }
            return a.hours - b.hours;
          })
          .slice(0, 4);

        setActionItems(studentsNeedingDocs);
        
        // Update stats
        const totalApplications = students.length;
        const offerLetterProcess = students.filter(s => {
          const status = s.status || 'Under review';
          return ['Under review', 'Offer requested', 'Offer received'].includes(status);
        }).length;
        const applicationProcessing = students.filter(s => {
          const status = s.status || 'Under review';
          return ['Application moved', 'Ministry submitted', 'Ministry approved', 'Fee paid'].includes(status);
        }).length;
        const visaProcess = students.filter(s => {
          const status = s.status || 'Under review';
          return ['Visa documents issued', 'Visa submitted'].includes(status);
        }).length;
        const studentFileCompleted = students.filter(s => {
          const status = s.status || 'Under review';
          return status === 'Visa received';
        }).length;
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
      }
    } catch (error) {
      console.error('Error refreshing data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCloseUploadModal = () => {
    setUploadModal({
      isOpen: false,
      studentId: null,
      studentName: '',
      missingDocument: ''
    });
  };

  return (
    <PartnerLayout>
      <div className="partner-dashboard">
        <div className="dashboard-content">
          {/* Main Content Area */}
          <div className="dashboard-main">
            {/* Welcome Section */}
            <div className="welcome-section">
              <h1>{getGreeting()}, {user?.companyName || 'Partner'}</h1>
              <p className="welcome-subtitle">
                Here's what's happening with your student applications today.
              </p>
            </div>

            {/* Statistics Cards */}
            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-icon total-applications">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                    <path d="M9 12H15M9 16H15M17 21H7C5.89543 21 5 20.1046 5 19V5C5 3.89543 5.89543 3 7 3H12.5858C12.851 3 13.1054 3.10536 13.2929 3.29289L18.7071 8.70711C18.8946 8.89464 19 9.149 19 9.41421V19C19 20.1046 18.1046 21 17 21Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <div className="stat-content">
                  <div className="stat-value">{stats.totalApplications.toLocaleString()}</div>
                  <div className="stat-label">Total Applications</div>
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-icon offer-letter-process">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                    <path d="M9 12L11 14L15 10M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <div className="stat-content">
                  <div className="stat-value">{stats.offerLetterProcess.toLocaleString()}</div>
                  <div className="stat-label">Offer Letter Process</div>
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-icon application-processing">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                    <path d="M12 6V12L16 14M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <div className="stat-content">
                  <div className="stat-value">{stats.applicationProcessing.toLocaleString()}</div>
                  <div className="stat-label">Application Processing</div>
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-icon visa-process">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                    <path d="M9 5H7C5.89543 5 5 5.89543 5 7V19C5 20.1046 5.89543 21 7 21H17C18.1046 21 19 20.1046 19 19V7C19 5.89543 18.1046 5 17 5H15M9 5C9 6.10457 9.89543 7 11 7H13C14.1046 7 15 6.10457 15 5M9 5C9 3.89543 9.89543 3 11 3H13C14.1046 3 15 3.89543 15 5M12 12H15M12 16H15M9 12H9.01M9 16H9.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <div className="stat-content">
                  <div className="stat-value">{stats.visaProcess.toLocaleString()}</div>
                  <div className="stat-label">Visa Process</div>
                </div>
              </div>

              <div className="stat-card success">
                <div className="stat-icon student-file-completed">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                    <path d="M9 12L11 14L15 10M20 7L12 3L4 7M20 7V17L12 21M20 7L12 11M12 21L4 17V7M12 21V11M4 7L12 11" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <div className="stat-content">
                  <div className="stat-value">{stats.studentFileCompleted.toLocaleString()}</div>
                  <div className="stat-label">Student File Completed</div>
                </div>
              </div>

              <div className="stat-card danger">
                <div className="stat-icon student-dropped">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                    <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <div className="stat-content">
                  <div className="stat-value">{stats.studentDropped.toLocaleString()}</div>
                  <div className="stat-label">Student Dropped</div>
                </div>
              </div>
            </div>

            {/* Action Required Section */}
            <div className="action-section">
              <div className="section-header">
                <h2 className="section-title">
                  <span className="action-icon">!</span>
                  Action Required
                </h2>
                <a href="/partner/students" className="view-all-link">View all tasks</a>
              </div>

              <div className="action-list">
                {actionItems.length > 0 ? (
                  actionItems.map((item) => (
                    <div key={item.id} className="action-item">
                      <div className="action-avatar">{item.avatar}</div>
                      <div className="action-details">
                        <div className="action-name">{item.name}</div>
                        <div className="action-meta">
                          {item.university} • {item.course}
                        </div>
                        <div className="action-required">
                          <span className="action-text">{item.action}</span>
                          <span className={`deadline ${item.hours < 24 ? 'urgent' : ''}`}>
                            <span className="clock-icon">🕐</span>
                            Deadline: {item.deadline}
                          </span>
                        </div>
                      </div>
                      <div className="action-buttons">
                        <button 
                          className="upload-btn" 
                          aria-label="Upload document"
                          onClick={() => handleUploadClick(item)}
                          title="Upload Document"
                        >
                          📤
                        </button>
                        <button 
                          className="edit-btn" 
                          aria-label="Edit/Add document"
                          onClick={() => handleUploadClick(item)}
                          title="Edit/Add Document"
                        >
                          ✏️
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="empty-action-state">
                    <p>No action items required at this time.</p>
                    <p className="empty-subtext">All students have their documents up to date.</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Sidebar */}
          <aside className="dashboard-sidebar">
            {/* Recent Updates */}
            <div className="updates-section">
              <h3 className="sidebar-title">Recent Updates</h3>
              <div className="updates-list">
                {recentUpdates.length > 0 ? (
                  recentUpdates.map((update, index) => (
                    <div key={update.id || index} className="update-item">
                      <div 
                        className={`update-dot ${update.type}`}
                        style={update.categoryColor ? { backgroundColor: update.categoryColor } : {}}
                      ></div>
                      <div className="update-content">
                        <div className="update-header">
                          <div className="update-time">{update.time}</div>
                          {update.category && (
                            <span 
                              className="update-category"
                              style={{ 
                                color: update.categoryColor,
                                backgroundColor: `${update.categoryColor}15`
                              }}
                            >
                              {update.category}
                            </span>
                          )}
                        </div>
                        <div className="update-text">{update.title}</div>
                        <div className="update-subtext">{update.subtitle}</div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="empty-updates-state">
                    <p>No recent updates</p>
                  </div>
                )}
              </div>
              <button className="view-activity-btn">View Full Activity Log</button>
            </div>

            {/* Priority Support */}
            <div className="support-section">
              <div className="support-icon">⭐</div>
              <h3 className="support-title">Priority Support</h3>
              <p className="support-text">
                Your agency is eligible for 24/7 priority support this month. Need help with an application or have questions?
              </p>
              <button className="support-btn">Contact Support</button>
            </div>
          </aside>
        </div>
      </div>

      {/* Document Upload Modal */}
      <DocumentUploadModal
        isOpen={uploadModal.isOpen}
        onClose={handleCloseUploadModal}
        studentId={uploadModal.studentId}
        studentName={uploadModal.studentName}
        missingDocument={uploadModal.missingDocument}
        onSuccess={handleUploadSuccess}
      />
    </PartnerLayout>
  );
};

export default Dashboard;
