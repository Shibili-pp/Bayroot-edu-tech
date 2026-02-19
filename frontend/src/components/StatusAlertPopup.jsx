import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './StatusAlertPopup.css';

const StatusAlertPopup = ({ pendingStudents, onSetReminder }) => {
  const navigate = useNavigate();
  const [reminderHours, setReminderHours] = useState(1);
  const [settingReminder, setSettingReminder] = useState(false);

  const handleStudentClick = (studentId) => {
    navigate(`/admin/applications/${studentId}`);
  };

  const handleSetReminder = async () => {
    if (reminderHours < 0) {
      alert('Reminder hours must be 0 or greater');
      return;
    }
    
    setSettingReminder(true);
    try {
      await onSetReminder(reminderHours);
    } catch (error) {
      console.error('Error setting reminder:', error);
      alert('Failed to set reminder. Please try again.');
    } finally {
      setSettingReminder(false);
    }
  };

  const formatTimeAgo = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffHours < 1) {
      return 'Less than 1 hour ago';
    } else if (diffHours < 24) {
      return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    } else {
      return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    }
  };

  return (
    <div className="status-alert-overlay">
      <div className="status-alert-popup">
        <div className="status-alert-header">
          <div className="status-alert-title">
            <span className="alert-icon">⚠️</span>
            <h2>Status Update Alert</h2>
          </div>
          <p className="alert-description">
            The following students have exceeded the minimum time required for status updates.
            Please review and update their statuses.
          </p>
        </div>

        <div className="status-alert-content">
          {pendingStudents.length > 0 ? (
            <div className="pending-students-list">
              <div className="students-list-header">
                <span className="header-student-name">Student Name</span>
                <span className="header-current-status">Current Status</span>
                <span className="header-next-status">Next Status</span>
                <span className="header-time">Time Elapsed</span>
              </div>
              <div className="students-list-body">
                {pendingStudents.map((student, index) => (
                  <div
                    key={`${student.studentId}-${student.nextStatus}-${index}`}
                    className="student-item"
                    onClick={() => handleStudentClick(student.studentId)}
                  >
                    <div className="student-info">
                      <div className="student-name">{student.studentName}</div>
                      <div className="student-meta">
                        <span>{student.university}</span>
                        <span>•</span>
                        <span>{student.course}</span>
                      </div>
                    </div>
                    <div className="student-status-info">
                      <span className="current-status-badge">{student.currentStatus}</span>
                      <span className="arrow">→</span>
                      <span className="next-status-badge">{student.nextStatus}</span>
                    </div>
                    <div className="time-elapsed">
                      {student.elapsedDisplay !== undefined ? (
                        <>
                          {student.elapsedDisplay} {student.elapsedUnit || (student.timeUnit === 'minutes' ? 'minutes' : student.timeUnit === 'days' ? 'days' : 'hours')}
                        </>
                      ) : (
                        <>
                          {typeof student.hoursElapsed === 'number' ? student.hoursElapsed.toFixed(1) : student.hoursElapsed} hour{student.hoursElapsed !== 1 ? 's' : ''}
                        </>
                      )}
                      <span className="time-since">({formatTimeAgo(student.statusUpdatedAt)})</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="no-pending-students">
              <p>No pending status updates at this time.</p>
            </div>
          )}
        </div>

        <div className="status-alert-footer">
          <div className="reminder-section">
            <label htmlFor="reminder-hours">Set Next Reminder (hours):</label>
            <div className="reminder-input-group">
              <input
                id="reminder-hours"
                type="number"
                min="0"
                value={reminderHours}
                onChange={(e) => setReminderHours(parseInt(e.target.value) || 0)}
                disabled={settingReminder}
                className="reminder-input"
              />
              <button
                onClick={handleSetReminder}
                disabled={settingReminder || reminderHours < 0}
                className="set-reminder-btn"
              >
                {settingReminder ? 'Setting...' : 'Set Reminder & Close'}
              </button>
            </div>
            <small className="reminder-hint">
              The alert will appear again after the specified number of hours.
            </small>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StatusAlertPopup;

