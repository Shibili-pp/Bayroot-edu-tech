import { useState, useEffect } from 'react';
import AdminLayout from '../../components/layout/AdminLayout';
import api from '../../api/axios';
import './UpdateTimeline.css';

const UpdateTimeline = () => {
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingRule, setEditingRule] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState({ show: false, id: null, fromStatus: '', toStatus: '' });
  const [deleting, setDeleting] = useState(false);
  const [formData, setFormData] = useState({
    fromStatus: '',
    toStatus: '',
    minHours: 0,
    isActive: true
  });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const statusOptions = [
    'Under Review',
    'Offer Requested',
    'Offer Received',
    'Application payment 1',
    'Application Moved',
    'Ministry Submitted',
    'Exam issued',
    'Application payment 2',
    'Fee Paid',
    'Visa Documents Issued',
    'Visa Submitted',
    'Visa Received',
    'Full fee',
    'Application payment 3',
    'Visa rejected',
    'Trc request',
    'Trc approved',
    'Trc rejected',
    'Student Dropped'
  ];

  useEffect(() => {
    fetchRules();
  }, []);

  const fetchRules = async () => {
    try {
      setLoading(true);
      const response = await api.get('/status-timeline');
      if (response.data.success) {
        setRules(response.data.data?.rules || []);
      }
    } catch (error) {
      console.error('Error fetching timeline rules:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (rule = null) => {
    if (rule) {
      setEditingRule(rule);
      setFormData({
        fromStatus: rule.fromStatus,
        toStatus: rule.toStatus,
        minHours: rule.minHours,
        isActive: rule.isActive
      });
    } else {
      setEditingRule(null);
      setFormData({
        fromStatus: '',
        toStatus: '',
        minHours: 0,
        isActive: true
      });
    }
    setError('');
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingRule(null);
    setFormData({
      fromStatus: '',
      toStatus: '',
      minHours: 0,
      isActive: true
    });
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.fromStatus || !formData.toStatus) {
      setError('Please select both from and to status');
      return;
    }

    if (formData.fromStatus === formData.toStatus) {
      setError('From status and to status cannot be the same');
      return;
    }

    if (formData.minHours < 0) {
      setError('Minimum hours must be 0 or greater');
      return;
    }

    setSubmitting(true);

    try {
      if (editingRule) {
        const response = await api.put(`/status-timeline/${editingRule._id}`, formData);
        if (response.data.success) {
          await fetchRules();
          handleCloseModal();
        } else {
          setError(response.data.message || 'Failed to update timeline rule');
        }
      } else {
        const response = await api.post('/status-timeline', formData);
        if (response.data.success) {
          await fetchRules();
          handleCloseModal();
        } else {
          setError(response.data.message || 'Failed to create timeline rule');
        }
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to save timeline rule');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteClick = (rule) => {
    setDeleteConfirm({
      show: true,
      id: rule._id,
      fromStatus: rule.fromStatus,
      toStatus: rule.toStatus
    });
  };

  const handleDeleteConfirm = async () => {
    if (!deleteConfirm.id) return;

    try {
      setDeleting(true);
      const response = await api.delete(`/status-timeline/${deleteConfirm.id}`);
      
      if (response.data.success) {
        await fetchRules();
        setDeleteConfirm({ show: false, id: null, fromStatus: '', toStatus: '' });
      } else {
        alert('Failed to delete timeline rule');
      }
    } catch (error) {
      console.error('Error deleting timeline rule:', error);
      alert(error.response?.data?.message || 'Failed to delete timeline rule');
    } finally {
      setDeleting(false);
    }
  };

  const handleDeleteCancel = () => {
    setDeleteConfirm({ show: false, id: null, fromStatus: '', toStatus: '' });
  };

  return (
    <AdminLayout>
      <div className="update-timeline-page">
        {/* Header */}
        <div className="timeline-header">
          <div>
            <h1>Update Timeline</h1>
            <p className="page-subtitle">Set minimum time requirements for status transitions</p>
          </div>
          <button 
            className="btn-new-rule"
            onClick={() => handleOpenModal()}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ marginRight: '6px' }}>
              <path d="M8 3V13M3 8H13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
            New Rule
          </button>
        </div>

        {/* Rules List */}
        {loading ? (
          <div className="loading-state">
            <div className="spinner"></div>
            <p>Loading timeline rules...</p>
          </div>
        ) : rules.length > 0 ? (
          <div className="rules-table-container">
            <table className="rules-table">
              <thead>
                <tr>
                  <th>From Status</th>
                  <th>To Status</th>
                  <th>Minimum Hours</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {rules.map((rule) => (
                  <tr key={rule._id}>
                    <td>
                      <span className="status-badge">{rule.fromStatus}</span>
                    </td>
                    <td>
                      <span className="status-badge">{rule.toStatus}</span>
                    </td>
                    <td>
                      <span className="hours-badge">{rule.minHours} hours</span>
                    </td>
                    <td>
                      <span className={`status-indicator ${rule.isActive ? 'active' : 'inactive'}`}>
                        {rule.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td>
                      <div className="action-buttons">
                        <button
                          className="btn-edit"
                          onClick={() => handleOpenModal(rule)}
                          title="Edit rule"
                        >
                          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                            <path d="M11.3333 2.00001C11.5084 1.82489 11.7163 1.68693 11.9447 1.59508C12.1731 1.50323 12.4173 1.45947 12.6633 1.46668C12.9094 1.47389 13.1521 1.53195 13.3756 1.63726C13.5992 1.74257 13.7988 1.8928 13.9622 2.07934C14.1257 2.26589 14.2495 2.48471 14.3264 2.72194C14.4033 2.95918 14.4316 3.20989 14.4093 3.45801C14.3871 3.70613 14.3148 3.94667 14.1971 4.16401C14.0794 4.38134 13.919 4.57067 13.7267 4.72001L6.66667 11.78L2.66667 12.6667L3.55333 8.66668L10.6133 1.60668L11.3333 2.00001Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        </button>
                        <button
                          className="btn-delete"
                          onClick={() => handleDeleteClick(rule)}
                          title="Delete rule"
                        >
                          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                            <path d="M12 4L4 12M4 4L12 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty-state">
            <p>No timeline rules found</p>
            <p className="empty-subtext">Create your first timeline rule using the "New Rule" button.</p>
          </div>
        )}

        {/* Create/Edit Modal */}
        {showModal && (
          <div className="modal-overlay" onClick={handleCloseModal}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h2>{editingRule ? 'Edit Timeline Rule' : 'New Timeline Rule'}</h2>
                <button className="modal-close" onClick={handleCloseModal} disabled={submitting}>
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                    <path d="M15 5L5 15M5 5L15 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                </button>
              </div>
              <form onSubmit={handleSubmit}>
                <div className="modal-body">
                  {error && (
                    <div className="error-message">
                      {error}
                    </div>
                  )}
                  <div className="form-group">
                    <label>From Status *</label>
                    <select
                      value={formData.fromStatus}
                      onChange={(e) => setFormData({ ...formData, fromStatus: e.target.value })}
                      required
                      disabled={submitting}
                    >
                      <option value="">Select status</option>
                      {statusOptions.map((status) => (
                        <option key={status} value={status}>{status}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>To Status *</label>
                    <select
                      value={formData.toStatus}
                      onChange={(e) => setFormData({ ...formData, toStatus: e.target.value })}
                      required
                      disabled={submitting}
                    >
                      <option value="">Select status</option>
                      {statusOptions
                        .filter(status => status !== formData.fromStatus)
                        .map((status) => (
                          <option key={status} value={status}>{status}</option>
                        ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Minimum Hours *</label>
                    <input
                      type="number"
                      value={formData.minHours}
                      onChange={(e) => setFormData({ ...formData, minHours: parseInt(e.target.value) || 0 })}
                      min="0"
                      required
                      disabled={submitting}
                      placeholder="e.g., 48"
                    />
                    <small>Minimum hours required before status can change from "{formData.fromStatus || '...'}" to "{formData.toStatus || '...'}"</small>
                  </div>
                  <div className="form-group">
                    <label className="checkbox-label">
                      <input
                        type="checkbox"
                        checked={formData.isActive}
                        onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                        disabled={submitting}
                      />
                      <span>Active</span>
                    </label>
                  </div>
                </div>
                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn-cancel"
                    onClick={handleCloseModal}
                    disabled={submitting}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn-submit"
                    disabled={submitting}
                  >
                    {submitting ? (
                      <>
                        <div className="spinner-small"></div>
                        {editingRule ? 'Updating...' : 'Creating...'}
                      </>
                    ) : (
                      editingRule ? 'Update Rule' : 'Create Rule'
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {deleteConfirm.show && (
          <div className="delete-modal-overlay" onClick={handleDeleteCancel}>
            <div className="delete-modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="delete-modal-header">
                <h3>Delete Timeline Rule</h3>
                <button className="delete-modal-close" onClick={handleDeleteCancel} disabled={deleting}>
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                    <path d="M15 5L5 15M5 5L15 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                </button>
              </div>
              <div className="delete-modal-body">
                <p>Are you sure you want to delete this timeline rule?</p>
                <div className="delete-preview">
                  <p><strong>From:</strong> {deleteConfirm.fromStatus}</p>
                  <p><strong>To:</strong> {deleteConfirm.toStatus}</p>
                </div>
                <p className="delete-warning">This action cannot be undone.</p>
              </div>
              <div className="delete-modal-actions">
                <button
                  className="btn-cancel-delete"
                  onClick={handleDeleteCancel}
                  disabled={deleting}
                >
                  Cancel
                </button>
                <button
                  className="btn-confirm-delete"
                  onClick={handleDeleteConfirm}
                  disabled={deleting}
                >
                  {deleting ? (
                    <>
                      <div className="spinner-small"></div>
                      Deleting...
                    </>
                  ) : (
                    'Delete'
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default UpdateTimeline;

