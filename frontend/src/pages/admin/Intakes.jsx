import { useState, useEffect } from 'react';
import AdminLayout from '../../components/layout/AdminLayout';
import api from '../../api/axios';
import './Intakes.css';

const Intakes = () => {
  const [intakes, setIntakes] = useState([]);
  const [countries, setCountries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingIntake, setEditingIntake] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState({ show: false, id: null, name: '' });
  const [formData, setFormData] = useState({
    name: '',
    countryId: ''
  });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchIntakes();
    fetchCountries();
  }, []);

  const fetchIntakes = async () => {
    try {
      setLoading(true);
      const response = await api.get('/intakes');
      if (response.data.success) {
        setIntakes(response.data.data?.intakes || []);
      }
    } catch (error) {
      console.error('Error fetching intakes:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCountries = async () => {
    try {
      const response = await api.get('/countries');
      if (response.data.success) {
        // Filter only active countries
        const activeCountries = (response.data.data?.countries || []).filter(c => c.isActive);
        setCountries(activeCountries);
      }
    } catch (error) {
      console.error('Error fetching countries:', error);
    }
  };

  const handleOpenModal = (intake = null) => {
    if (intake) {
      setEditingIntake(intake);
      setFormData({
        name: intake.name || '',
        countryId: intake.countryId?._id || intake.countryId || ''
      });
    } else {
      setEditingIntake(null);
      setFormData({
        name: '',
        countryId: ''
      });
    }
    setError('');
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingIntake(null);
    setFormData({
      name: '',
      countryId: ''
    });
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      if (editingIntake) {
        // Update
        const response = await api.put(`/intakes/${editingIntake._id}`, formData);
        if (response.data.success) {
          await fetchIntakes();
          handleCloseModal();
        } else {
          setError(response.data.message || 'Failed to update intake');
        }
      } else {
        // Create
        const response = await api.post('/intakes', formData);
        if (response.data.success) {
          await fetchIntakes();
          handleCloseModal();
        } else {
          setError(response.data.message || 'Failed to create intake');
        }
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Operation failed');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteClick = (intake) => {
    setDeleteConfirm({
      show: true,
      id: intake._id,
      name: intake.name
    });
  };

  const handleDeleteConfirm = async () => {
    try {
      const response = await api.delete(`/intakes/${deleteConfirm.id}`);
      if (response.data.success) {
        await fetchIntakes();
        setDeleteConfirm({ show: false, id: null, name: '' });
      } else {
        alert('Failed to delete intake');
      }
    } catch (error) {
      console.error('Error deleting intake:', error);
      alert(error.response?.data?.message || 'Failed to delete intake');
    }
  };

  return (
    <AdminLayout>
      <div className="intakes-page">
        <div className="page-header">
          <div>
            <h1>Intakes</h1>
            <p>Manage intakes and their associated countries</p>
          </div>
          <button className="btn-primary" onClick={() => handleOpenModal()}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ marginRight: '6px' }}>
              <path d="M8 3V13M3 8H13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
            Create New Intake
          </button>
        </div>

        {loading ? (
          <div className="loading-state">
            <div className="spinner"></div>
            <p>Loading intakes...</p>
          </div>
        ) : intakes.length > 0 ? (
          <div className="intakes-grid">
            {intakes.map((intake) => (
              <div key={intake._id} className="intake-card">
                <div className="card-header">
                  <h3>{intake.name}</h3>
                  <div className="card-actions">
                    <button
                      className="btn-icon"
                      onClick={() => handleOpenModal(intake)}
                      title="Edit"
                    >
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                        <path d="M11.3333 2.00001C11.5084 1.8249 11.7163 1.68605 11.9444 1.59128C12.1726 1.49652 12.4163 1.44775 12.6625 1.44775C12.9087 1.44775 13.1524 1.49652 13.3806 1.59128C13.6087 1.68605 13.8166 1.8249 13.9917 2.00001C14.1668 2.17512 14.3056 2.38304 14.4004 2.61118C14.4952 2.83932 14.544 3.08301 14.544 3.32918C14.544 3.57535 14.4952 3.81904 14.4004 4.04718C14.3056 4.27532 14.1668 4.48324 13.9917 4.65835L5.32499 13.325L1.33333 14.6667L2.67499 10.675L11.3333 2.00001Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </button>
                    <button
                      className="btn-icon delete"
                      onClick={() => handleDeleteClick(intake)}
                      title="Delete"
                    >
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                        <path d="M12 4L4 12M4 4L12 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </button>
                  </div>
                </div>
                <div className="card-body">
                  <div className="info-row">
                    <span className="label">Country:</span>
                    <span className="value">
                      {intake.countryId?.name || 'N/A'}
                      {intake.countryId?.code && ` (${intake.countryId.code})`}
                    </span>
                  </div>
                  <div className="info-row">
                    <span className="label">Status:</span>
                    <span className={`status-badge ${intake.isActive ? 'active' : 'inactive'}`}>
                      {intake.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <p>No intakes found</p>
            <p className="empty-subtext">Create your first intake to get started.</p>
            <button className="btn-primary" onClick={() => handleOpenModal()}>
              Create New Intake
            </button>
          </div>
        )}

        {/* Create/Edit Modal */}
        {showModal && (
          <div className="modal-overlay" onClick={handleCloseModal}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h2>{editingIntake ? 'Edit Intake' : 'Create New Intake'}</h2>
                <button className="modal-close" onClick={handleCloseModal} disabled={submitting}>
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                    <path d="M15 5L5 15M5 5L15 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                </button>
              </div>
              <form onSubmit={handleSubmit} className="modal-form">
                {error && <div className="form-error">{error}</div>}
                <div className="form-group">
                  <label>Intake Name <span className="required">*</span></label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                    disabled={submitting}
                    placeholder="e.g., Fall 2024, Spring 2025"
                  />
                </div>
                <div className="form-group">
                  <label>Country <span className="required">*</span></label>
                  <select
                    value={formData.countryId}
                    onChange={(e) => setFormData({ ...formData, countryId: e.target.value })}
                    required
                    disabled={submitting}
                    className="form-select"
                  >
                    <option value="">Select a country</option>
                    {countries.map((country) => (
                      <option key={country._id} value={country._id}>
                        {country.name} {country.code && `(${country.code})`}
                      </option>
                    ))}
                  </select>
                  {countries.length === 0 && (
                    <small style={{ color: '#6b7280', fontSize: '0.75rem', marginTop: '0.25rem', display: 'block' }}>
                      No countries available. Please create a country first.
                    </small>
                  )}
                </div>
                <div className="modal-actions">
                  <button type="button" onClick={handleCloseModal} disabled={submitting} className="btn-cancel">
                    Cancel
                  </button>
                  <button type="submit" disabled={submitting} className="btn-submit">
                    {submitting ? 'Saving...' : editingIntake ? 'Update' : 'Create'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {deleteConfirm.show && (
          <div className="modal-overlay" onClick={() => setDeleteConfirm({ show: false, id: null, name: '' })}>
            <div className="modal-content delete-modal" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h2>Delete Intake</h2>
                <button className="modal-close" onClick={() => setDeleteConfirm({ show: false, id: null, name: '' })}>
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                    <path d="M15 5L5 15M5 5L15 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                </button>
              </div>
              <div className="modal-body">
                <p>Are you sure you want to delete <strong>{deleteConfirm.name}</strong>?</p>
                <p className="warning-text">This action cannot be undone.</p>
              </div>
              <div className="modal-actions">
                <button
                  type="button"
                  onClick={() => setDeleteConfirm({ show: false, id: null, name: '' })}
                  className="btn-cancel"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDeleteConfirm}
                  className="btn-delete"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default Intakes;

