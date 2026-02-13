import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import AdminLayout from '../../components/layout/AdminLayout';
import api from '../../api/axios';
import './Dashboard.css';

/**
 * Admin Home Page
 */
const Dashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    totalStudents: 0,
    totalPartners: 0,
    pendingDocuments: 0,
    recentActivity: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch dashboard statistics
    const fetchStats = async () => {
      try {
        // You can add API calls here to fetch real statistics
        // For now, using mock data
        setStats({
          totalStudents: 0,
          totalPartners: 0,
          pendingDocuments: 0,
          recentActivity: 0
        });
      } catch (error) {
        console.error('Error fetching stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  return (
    <AdminLayout>
      <div className="admin-home">
        {/* Welcome Section */}
        <div className="welcome-section">
          <h1>Welcome back, Admin!</h1>
          <p className="welcome-subtitle">
            Manage your platform, monitor activities, and oversee all operations from here.
          </p>
        </div>

        {/* Statistics Cards */}
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon students">👥</div>
            <div className="stat-content">
              <h3>{stats.totalStudents}</h3>
              <p>Total Students</p>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon partners">🏢</div>
            <div className="stat-content">
              <h3>{stats.totalPartners}</h3>
              <p>Active Partners</p>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon documents">📄</div>
            <div className="stat-content">
              <h3>{stats.pendingDocuments}</h3>
              <p>Pending Documents</p>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon activity">📊</div>
            <div className="stat-content">
              <h3>{stats.recentActivity}</h3>
              <p>Recent Activities</p>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="quick-actions-section">
          <h2>Quick Actions</h2>
          <div className="actions-grid">
            <div className="action-card">
              <div className="action-icon">👥</div>
              <h3>Manage Students</h3>
              <p>View, edit, and manage all student records</p>
              <button className="action-btn">View Students</button>
            </div>

            <div className="action-card">
              <div className="action-icon">🏢</div>
              <h3>Manage Partners</h3>
              <p>Oversee partner accounts and permissions</p>
              <button className="action-btn">View Partners</button>
            </div>

            <div className="action-card">
              <div className="action-icon">📊</div>
              <h3>View Reports</h3>
              <p>Access analytics and platform reports</p>
              <button className="action-btn">View Reports</button>
            </div>

            <div className="action-card">
              <div className="action-icon">⚙️</div>
              <h3>Settings</h3>
              <p>Configure platform settings and preferences</p>
              <button className="action-btn">Settings</button>
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="recent-activity-section">
          <h2>Recent Activity</h2>
          <div className="activity-list">
            <div className="activity-item">
              <div className="activity-icon">✓</div>
              <div className="activity-content">
                <p><strong>System</strong> - Platform is running smoothly</p>
                <span className="activity-time">Just now</span>
              </div>
            </div>
            <div className="activity-item">
              <div className="activity-icon">ℹ️</div>
              <div className="activity-content">
                <p>No recent activities to display</p>
                <span className="activity-time">-</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default Dashboard;
