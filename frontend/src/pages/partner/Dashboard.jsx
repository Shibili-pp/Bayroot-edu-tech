import PartnerLayout from '../../components/layout/PartnerLayout';

/**
 * Partner Dashboard Page
 */
const Dashboard = () => {
  return (
    <PartnerLayout>
      <div className="dashboard-container">
        <h1>Partner Dashboard</h1>
        <p>Welcome to the Partner Dashboard</p>
        <div className="dashboard-content">
          <p>This is a placeholder for partner dashboard content.</p>
          <p>Add your partner-specific components and features here.</p>
        </div>
      </div>
    </PartnerLayout>
  );
};

export default Dashboard;

