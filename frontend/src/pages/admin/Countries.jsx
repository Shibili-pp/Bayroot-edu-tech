import { useState, useEffect } from 'react';
import AdminLayout from '../../components/layout/AdminLayout';
import api from '../../api/axios';
import './Countries.css';

const Countries = () => {
  const [countries, setCountries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingCountry, setEditingCountry] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState({ show: false, id: null, name: '' });
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    description: ''
  });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchCountries();
  }, []);

  const fetchCountries = async () => {
    try {
      setLoading(true);
      const response = await api.get('/countries');
      if (response.data.success) {
        setCountries(response.data.data?.countries || []);
      }
    } catch (error) {
      console.error('Error fetching countries:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (country = null) => {
    if (country) {
      setEditingCountry(country);
      setFormData({
        name: country.name || '',
        code: country.code || '',
        description: country.description || ''
      });
    } else {
      setEditingCountry(null);
      setFormData({
        name: '',
        code: '',
        description: ''
      });
    }
    setError('');
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingCountry(null);
    setFormData({
      name: '',
      code: '',
      description: ''
    });
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      if (editingCountry) {
        // Update
        const response = await api.put(`/countries/${editingCountry._id}`, formData);
        if (response.data.success) {
          await fetchCountries();
          handleCloseModal();
        } else {
          setError(response.data.message || 'Failed to update country');
        }
      } else {
        // Create
        const response = await api.post('/countries', formData);
        if (response.data.success) {
          await fetchCountries();
          handleCloseModal();
        } else {
          setError(response.data.message || 'Failed to create country');
        }
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Operation failed');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteClick = (country) => {
    setDeleteConfirm({
      show: true,
      id: country._id,
      name: country.name
    });
  };

  const handleDeleteConfirm = async () => {
    try {
      const response = await api.delete(`/countries/${deleteConfirm.id}`);
      if (response.data.success) {
        await fetchCountries();
        setDeleteConfirm({ show: false, id: null, name: '' });
      } else {
        alert('Failed to delete country');
      }
    } catch (error) {
      console.error('Error deleting country:', error);
      alert(error.response?.data?.message || 'Failed to delete country');
    }
  };

  return (
    <AdminLayout>
      <div className="countries-page">
        <div className="page-header">
          <div>
            <h1>Countries</h1>
            <p>Manage countries and their information</p>
          </div>
          <button className="btn-primary" onClick={() => handleOpenModal()}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ marginRight: '6px' }}>
              <path d="M8 3V13M3 8H13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
            Create New Country
          </button>
        </div>

        {loading ? (
          <div className="loading-state">
            <div className="spinner"></div>
            <p>Loading countries...</p>
          </div>
        ) : countries.length > 0 ? (
          <div className="countries-grid">
            {countries.map((country) => (
              <div key={country._id} className="country-card">
                <div className="card-header">
                  <div>
                    <h3>{country.name}</h3>
                    <span className="country-code">{country.code}</span>
                  </div>
                  <div className="card-actions">
                    <button
                      className="btn-icon"
                      onClick={() => handleOpenModal(country)}
                      title="Edit"
                    >
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                        <path d="M11.3333 2.00001C11.5084 1.8249 11.7163 1.68605 11.9444 1.59128C12.1726 1.49652 12.4163 1.44775 12.6625 1.44775C12.9087 1.44775 13.1524 1.49652 13.3806 1.59128C13.6087 1.68605 13.8166 1.8249 13.9917 2.00001C14.1668 2.17512 14.3056 2.38304 14.4004 2.61118C14.4952 2.83932 14.544 3.08301 14.544 3.32918C14.544 3.57535 14.4952 3.81904 14.4004 4.04718C14.3056 4.27532 14.1668 4.48324 13.9917 4.65835L5.32499 13.325L1.33333 14.6667L2.67499 10.675L11.3333 2.00001Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </button>
                    <button
                      className="btn-icon delete"
                      onClick={() => handleDeleteClick(country)}
                      title="Delete"
                    >
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                        <path d="M12 4L4 12M4 4L12 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </button>
                  </div>
                </div>
                <div className="card-body">
                  {country.description && (
                    <div className="info-row">
                      <span className="label">Description:</span>
                      <span className="value">{country.description}</span>
                    </div>
                  )}
                  <div className="info-row">
                    <span className="label">Status:</span>
                    <span className={`status-badge ${country.isActive ? 'active' : 'inactive'}`}>
                      {country.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <p>No countries found</p>
            <p className="empty-subtext">Create your first country to get started.</p>
            <button className="btn-primary" onClick={() => handleOpenModal()}>
              Create New Country
            </button>
          </div>
        )}

        {/* Create/Edit Modal */}
        {showModal && (
          <div className="modal-overlay" onClick={handleCloseModal}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h2>{editingCountry ? 'Edit Country' : 'Create New Country'}</h2>
                <button className="modal-close" onClick={handleCloseModal} disabled={submitting}>
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                    <path d="M15 5L5 15M5 5L15 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                </button>
              </div>
              <form onSubmit={handleSubmit} className="modal-form">
                {error && <div className="form-error">{error}</div>}
                <div className="form-group">
                  <label>Country Name <span className="required">*</span></label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                    disabled={submitting}
                    placeholder="e.g., Canada"
                  />
                </div>
                <div className="form-group">
                  <label>Country Code <span className="required">*</span></label>
                  <input
                    type="text"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                    required
                    disabled={submitting}
                    placeholder="e.g., CA"
                    maxLength="3"
                    style={{ textTransform: 'uppercase' }}
                  />
                  <small style={{ color: '#6b7280', fontSize: '0.75rem', marginTop: '0.25rem', display: 'block' }}>
                    2-3 letter country code (e.g., US, CA, UK)
                  </small>
                </div>
                <div className="form-group">
                  <label>Description</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    disabled={submitting}
                    rows="4"
                    placeholder="Enter country description..."
                  />
                </div>
                <div className="modal-actions">
                  <button type="button" onClick={handleCloseModal} disabled={submitting} className="btn-cancel">
                    Cancel
                  </button>
                  <button type="submit" disabled={submitting} className="btn-submit">
                    {submitting ? 'Saving...' : editingCountry ? 'Update' : 'Create'}
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
                <h2>Delete Country</h2>
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

export default Countries;


