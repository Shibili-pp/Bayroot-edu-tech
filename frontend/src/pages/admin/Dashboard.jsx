import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import AdminLayout from '../../components/layout/AdminLayout';
import api from '../../api/axios';
import './Dashboard.css';

/**
 * Admin Dashboard Page
 */
const Dashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    totalApplications: 1284,
    pendingDocs: 45,
    submitted: 892,
    offerReceived: 312,
    rejected: 54
  });
  const [loading, setLoading] = useState(false);

  const recentApplications = [
    {
      id: 1,
      studentName: 'Arjun Mehta',
      initials: 'AM',
      university: 'University of Toronto',
      status: 'Offer Received',
      statusType: 'success',
      date: '2 mins ago'
    },
    {
      id: 2,
      studentName: 'Sarah Khan',
      initials: 'SK',
      university: "King's College London",
      status: 'Submitted',
      statusType: 'info',
      date: '1 hour ago'
    },
    {
      id: 3,
      studentName: 'Li Jun',
      initials: 'LJ',
      university: 'Monash University',
      status: 'Pending Docs',
      statusType: 'warning',
      date: '4 hours ago'
    },
    {
      id: 4,
      studentName: 'David Ross',
      initials: 'DR',
      university: 'Technical University of Munich',
      status: 'Submitted',
      statusType: 'info',
      date: '6 hours ago'
    }
  ];

  const upcomingDeadlines = [
    {
      id: 1,
      university: 'University of Melbourne',
      program: 'MSc Computer Science - Intake 2024',
      daysLeft: 2,
      priority: 'high'
    },
    {
      id: 2,
      university: 'UCL London',
      program: 'MBA International Business',
      daysLeft: 5,
      priority: 'medium'
    },
    {
      id: 3,
      university: 'Harvard University',
      program: 'Public Policy Graduate Program',
      daysLeft: 12,
      priority: 'standard'
    },
    {
      id: 4,
      university: 'National University Singapore',
      program: 'Engineering Ph.D. Applications',
      daysLeft: 18,
      priority: 'standard'
    }
  ];

  useEffect(() => {
    // Fetch dashboard statistics
    const fetchStats = async () => {
      try {
        // You can add API calls here to fetch real statistics
        // For now, using mock data
        setLoading(false);
      } catch (error) {
        console.error('Error fetching stats:', error);
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  const getStatusBadgeClass = (statusType) => {
    const classes = {
      success: 'status-badge success',
      info: 'status-badge info',
      warning: 'status-badge warning',
      danger: 'status-badge danger'
    };
    return classes[statusType] || classes.info;
  };

  const getPriorityClass = (priority) => {
    const classes = {
      high: 'deadline-card high',
      medium: 'deadline-card medium',
      standard: 'deadline-card standard'
    };
    return classes[priority] || classes.standard;
  };

  return (
    <AdminLayout>
      <div className="admin-dashboard">
        {/* Welcome Section */}
        <div className="welcome-section">
          <h1>Welcome back, Admin 👋</h1>
          <p className="welcome-subtitle">
            Here's what's happening with Bayroot International today.
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
              <h3>{stats.totalApplications.toLocaleString()}</h3>
              <p>Total Applications</p>
              <span className="stat-change positive">+12%↑</span>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon pending-docs">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M12 6V12L16 14M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <div className="stat-content">
              <h3>{stats.pendingDocs}</h3>
              <p>Pending Docs</p>
              <span className="stat-label active">Active</span>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon submitted">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M5 12L10 17L20 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <div className="stat-content">
              <h3>{stats.submitted.toLocaleString()}</h3>
              <p>Submitted</p>
              <span className="stat-change positive">+5%↑</span>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon offer-received">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M9 12L11 14L15 10M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <div className="stat-content">
              <h3>{stats.offerReceived.toLocaleString()}</h3>
              <p>Offer Received</p>
              <span className="stat-change positive">+18%↑</span>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon rejected">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <div className="stat-content">
              <h3>{stats.rejected}</h3>
              <p>Rejected</p>
              <span className="stat-change negative">-2%↓</span>
            </div>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="dashboard-content-grid">
          {/* Recent Application Activity */}
          <div className="recent-activity-section">
            <div className="section-header">
              <h2>Recent Application Activity</h2>
              <a href="/admin/applications" className="view-all-link">View All</a>
            </div>
            <div className="activity-table">
              <table>
                <thead>
                  <tr>
                    <th>STUDENT NAME</th>
                    <th>UNIVERSITY</th>
                    <th>STATUS</th>
                    <th>DATE</th>
                  </tr>
                </thead>
                <tbody>
                  {recentApplications.map((app) => (
                    <tr key={app.id}>
                      <td>
                        <div className="student-cell">
                          <div className="student-avatar">{app.initials}</div>
                          <span>{app.studentName}</span>
                        </div>
                      </td>
                      <td>{app.university}</td>
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
          </div>

          {/* Upcoming Deadlines */}
          <div className="deadlines-section">
            <h2>Upcoming Deadlines</h2>
            <div className="deadlines-list">
              {upcomingDeadlines.map((deadline) => (
                <div key={deadline.id} className={getPriorityClass(deadline.priority)}>
                  <div className="deadline-header">
                    <span className="priority-badge">{deadline.priority.toUpperCase()} PRIORITY</span>
                  </div>
                  <div className="deadline-content">
                    <h3>{deadline.university}</h3>
                    <p>{deadline.program}</p>
                    <div className="deadline-footer">
                      <span className="days-left">{deadline.daysLeft} Days Left</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <button className="view-all-deadlines-btn">View All Deadlines</button>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default Dashboard;
