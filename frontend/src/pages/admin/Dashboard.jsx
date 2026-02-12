import AdminLayout from '../../components/layout/AdminLayout';

/**
 * Admin Dashboard Page
 */
const Dashboard = () => {
  return (
    <AdminLayout>
      <div className="dashboard-container">
        <h1>Admin Dashboard</h1>
        <p>Welcome to the Admin Dashboard</p>
        <div className="dashboard-content">
          <p>This is a placeholder for admin dashboard content.</p>
          <p>Add your admin-specific components and features here.</p>
        </div>
      </div>
    </AdminLayout>
  );
};

export default Dashboard;

