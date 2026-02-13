import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import PartnerLayout from '../../components/layout/PartnerLayout';
import api from '../../api/axios';
import './Dashboard.css';

/**
 * Partner Home Page - Using Real Data
 */
const Dashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    totalStudents: 0,
    inProgress: 0,
    pendingDocs: 0,
    offersReceived: 0
  });
  const [actionItems, setActionItems] = useState([]);
  const [recentUpdates, setRecentUpdates] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch all students (without pagination limit to get all)
        const studentsResponse = await api.get('/students?limit=1000');
        if (studentsResponse.data.success) {
          const students = studentsResponse.data.data?.students || [];
          
          // Calculate statistics
          const totalStudents = students.length;
          
          // In Progress: Students with at least one document
          const inProgress = students.filter(s => s.documents && s.documents.length > 0).length;
          
          // Pending Docs: Students with fewer than 3 documents (assuming 3 is minimum required)
          // Or students created more than 7 days ago with no documents
          const sevenDaysAgo = new Date();
          sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
          const pendingDocs = students.filter(s => {
            const docCount = s.documents?.length || 0;
            const createdDate = new Date(s.createdAt);
            return docCount < 3 || (docCount === 0 && createdDate < sevenDaysAgo);
          }).length;
          
          // Offers Received: Students with documents (simplified - can be enhanced later)
          const offersReceived = students.filter(s => s.documents && s.documents.length >= 3).length;
          
          setStats({
            totalStudents,
            inProgress,
            pendingDocs,
            offersReceived
          });

          // Generate action items from students missing documents
          const studentsNeedingDocs = students
            .filter(s => {
              const docCount = s.documents?.length || 0;
              return docCount < 3;
            })
            .slice(0, 4) // Show max 4 action items
            .map((student, index) => {
              const docCount = student.documents?.length || 0;
              const createdDate = new Date(student.createdAt);
              const daysSinceCreation = Math.floor((Date.now() - createdDate.getTime()) / (1000 * 60 * 60 * 24));
              
              // Determine missing document type based on what's needed
              const missingDocs = [];
              if (!student.documents?.some(d => d.fileType === 'pdf')) {
                missingDocs.push('Passport Copy');
              }
              if (!student.documents?.some(d => d.fileType === 'pdf' && d.originalName?.toLowerCase().includes('ielts'))) {
                missingDocs.push('IELTS Certificate');
              }
              if (!student.documents?.some(d => d.fileType === 'pdf' && d.originalName?.toLowerCase().includes('bank'))) {
                missingDocs.push('Bank Statement');
              }
              if (!student.documents?.some(d => d.fileType === 'pdf' && d.originalName?.toLowerCase().includes('visa'))) {
                missingDocs.push('Visa Copy');
              }
              
              const actionText = missingDocs.length > 0 
                ? `MISSING ${missingDocs[0]}` 
                : 'MISSING Documents';
              
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
                id: student.id,
                name: student.fullName,
                university: student.countryPreference,
                course: student.coursePreference,
                action: actionText,
                deadline: deadlineText,
                hours: hoursLeft,
                avatar: student.fullName?.charAt(0)?.toUpperCase() || '👤',
                studentId: student.id
              };
            });

          setActionItems(studentsNeedingDocs);

          // Generate recent updates from student activities
          const recentStudents = students
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
            .slice(0, 4);
          
          const updates = recentStudents.map((student, index) => {
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

          setRecentUpdates(updates);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
        // Set empty states on error
        setActionItems([]);
        setRecentUpdates([]);
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

  const handleUploadClick = (studentId) => {
    // Navigate to student detail page or open upload modal
    window.location.href = `/partner/students/${studentId}`;
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
                <div className="stat-icon overall">👥</div>
                <div className="stat-content">
                  <div className="stat-value">{stats.totalStudents.toLocaleString()}</div>
                  <div className="stat-label">Total Students</div>
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-icon active">📄</div>
                <div className="stat-content">
                  <div className="stat-value">{stats.inProgress}</div>
                  <div className="stat-label">In Progress</div>
                </div>
              </div>

              <div className="stat-card urgent">
                <div className="stat-icon urgent-icon">⚠️</div>
                <div className="stat-content">
                  <div className="stat-value">{stats.pendingDocs}</div>
                  <div className="stat-label">Pending Docs</div>
                </div>
              </div>

              <div className="stat-card success">
                <div className="stat-icon success-icon">✓</div>
                <div className="stat-content">
                  <div className="stat-value">{stats.offersReceived}</div>
                  <div className="stat-label">Offers Received</div>
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
                      <button 
                        className="upload-btn" 
                        aria-label="Upload document"
                        onClick={() => handleUploadClick(item.studentId)}
                      >
                        📤
                      </button>
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
                    <div key={index} className="update-item">
                      <div className={`update-dot ${update.type}`}></div>
                      <div className="update-content">
                        <div className="update-time">{update.time}</div>
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
    </PartnerLayout>
  );
};

export default Dashboard;
