import AdminLayout from '../../components/layout/AdminLayout';
import ChangePasswordSection from '../../components/ChangePasswordSection';
import './AdminSettings.css';

const AdminSettings = () => {
  return (
    <AdminLayout>
      <div className="admin-settings-page">
        <div className="settings-header">
          <h1>Settings</h1>
          <p>Manage your account preferences</p>
        </div>
        <div className="settings-content">
          <ChangePasswordSection apiBase="/admin" />
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminSettings;
