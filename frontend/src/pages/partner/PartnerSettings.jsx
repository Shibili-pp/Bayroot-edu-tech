import PartnerLayout from '../../components/layout/PartnerLayout';
import ChangePasswordSection from '../../components/ChangePasswordSection';
import './PartnerSettings.css';

const PartnerSettings = () => {
  return (
    <PartnerLayout>
      <div className="partner-settings-page">
        <div className="settings-header">
          <h1>Settings</h1>
          <p>Manage your account preferences</p>
        </div>
        <div className="settings-content">
          <ChangePasswordSection apiBase="/partner" />
        </div>
      </div>
    </PartnerLayout>
  );
};

export default PartnerSettings;
